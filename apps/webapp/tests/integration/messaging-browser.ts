import assert from 'node:assert/strict';
import { mkdir, readFile } from 'node:fs/promises';
import { chromium } from 'playwright';
import { ensurePlaywrightChromium } from '../../scripts/playwright-browsers';

ensurePlaywrightChromium();
const browser = await chromium.launch({ headless: true });
try {
  const page = await browser.newPage();
 page.on('requestfailed', request => { const url = new URL(request.url()); console.log('Failed request:', url.origin + url.pathname); });
 page.on('pageerror', error => console.log('Page error:', error.message));
 page.on('console', item => { if (item.type() === 'error') console.log('Console:', item.text()); });
  const origin = process.env.WEBAPP_URL ?? 'http://127.0.0.1:5179';
  const apiOrigin = process.env.API_URL ?? 'http://127.0.0.1:19999';
  assert(['127.0.0.1', 'localhost'].includes(new URL(apiOrigin).hostname), 'This isolated UI harness requires a local API origin');
  const grants = ['SCHOOL_MESSAGES_READ', 'SCHOOL_MESSAGES_REPLY', 'TEACHER_MESSAGES_REVIEW'].map(permission => ({ permission, scopes: [{ kind: 'school' }] }));
  let edgeCase = false;
  const longBody = 'First line\nhttps://example.test/' + 'x'.repeat(9968);
  let version = 1;
  let destination = 'school';
  let status = 'awaiting_school';
  const sent: Record<string, unknown>[] = [];
  const summary = () => ({ id: 'thread', schoolId: 'school', guardianId: 'guardian', destination,
    studentName: 'Robin', guardianName: 'Sam Parent', schoolName: 'Oak School', teacherName: 'Ada Teacher',
    subject: 'Opening hours', status, version, lastSequence: version, unread: true, lastMessage: 'When do you open?',
    updatedAt: '2026-10-04T12:00:00Z', allowedActions: { reply: destination === 'school', resolve: destination === 'school', reason: null } });
  const detail = () => ({ conversation: summary(), messages: [{ id: 'message1', sequence: 1,
    authorKind: 'guardian', authorId: 'guardian', authorName: edgeCase ? 'A long guardian name '.repeat(8) : 'Sam Parent', createdAt: '2026-10-04T12:00:00Z', body: edgeCase ? longBody : 'When do you open?' },
    ...(version > 1 ? [{ id: 'message2', sequence: 2, authorKind: destination === 'teacher' ? 'teacher' : 'staff', authorId: 'colleague', authorName: edgeCase ? 'A long guardian name '.repeat(8) : destination === 'teacher' ? 'Ada Teacher' : 'Other Secretary', createdAt: '2026-10-04T12:05:00Z', body: 'A newer staff answer' }] : []), ...(edgeCase ? [{ id: 'message3', sequence: 3, authorKind: 'staff', authorId: 'secretary', authorName: 'School Secretary', createdAt: '2026-10-04T12:06:00Z', body: 'Another staff reply' }] : [])], hasMore: false });
  await page.route(`${apiOrigin}/auth/**`, async route => {
    const path = new URL(route.request().url()).pathname;
    const body = path.endsWith('/access-token')
      ? { accessToken: 'test-header.test-payload.test-signature', expiresAt: new Date(Date.now() + 3600000).toISOString() }
      : path.endsWith('/session')
        ? { user: { id: 'login', email: 'secretary@example.test' }, account: { id: 'login', identifiers: [] }, session: { id: 'fixture-session' } }
        : { email: true, phone: false };
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(body) });
  });
  await page.route(`${apiOrigin}/core/**`, async route => {
    const url = route.request().url();
    const input = route.request().postDataJSON() ?? {};
    let body: unknown = [];
    let code = 200;
    if (url.endsWith('/authorization/profiles')) body = { profiles: [{ kind: 'staff', actorId: 'secretary', schoolId: 'school', schoolName: 'Oak School' }] };
    if (url.endsWith('/authorization/effective-grants')) body = { kind: 'staff', actorId: 'secretary', schoolId: 'school', grants };
    if (url.endsWith('/staff-members/secretary')) body = { id: 'secretary', schoolId: 'school', firstName: 'School', lastName: 'Secretary', subjectId: 'login' };
    if (url.endsWith('/onboarding/account-status')) body = { wizardCompleted: true, maxReachedStep: 4, schoolStepSubmitted: true, structureStepSubmitted: true };
 if (url.includes('get-app-shell-counts')) body = { activeEnrollmentCountsByClass: {}, studentCount: 0, guardianCount: 0, staffCount: 0, teacherCount: 0 };
 if (url.endsWith('/schools/school')) body = { id: 'school', name: 'Oak School', shortName: 'Oak', timeZone: 'UTC', type: 'k12' };
    if (url.includes('list-conversations')) body = { items: [summary()], total: 1, unreadCount: 1, offset: 0, limit: 25 };
    if (url.includes('get-conversation')) body = detail();
    if (url.includes('mark-conversation-read')) body = { success: true };
    if (url.includes('reply-conversation')) {
      sent.push(input);
      if (input.expectedVersion !== version) { code = 409; body = { code: 'CONVERSATION_CHANGED' }; }
      else { version++; status = 'awaiting_guardian'; body = summary(); }
    }
    if (url.includes('resolve-conversation')) { version++; status = 'resolved'; body = summary(); }
    await route.fulfill({ status: code, contentType: 'application/json', headers: { 'access-control-allow-origin': origin, 'access-control-allow-credentials': 'true', 'access-control-allow-methods': 'GET,POST,OPTIONS', 'access-control-allow-headers': 'content-type,authorization,accept-language,x-actor-id,x-actor-kind,x-school-id,x-academic-year-id' }, body: JSON.stringify(body) });
  });
  await page.addInitScript(() => sessionStorage.setItem('edaya:auth-gate', '1'));
  await page.goto(`${origin}/school/messages/thread`);
  await page.evaluate(async () => {
    const modules = (path: string) => import(/* @vite-ignore */ path);
    const { lang } = await modules('/src/lib/i18n/index.ts');
    lang.set('en');
  });
 const drawer = page.getByRole('dialog').filter({ has: page.getByText('Opening hours', { exact: true }) });
  await drawer.waitFor();
  const palettes = JSON.parse(await readFile(new URL('../../../../design-system/tokens.json', import.meta.url), 'utf8')).colors;
  async function captureThread(view: string) {
    const output = process.env.EDAYA_MESSAGE_CAPTURES;
    if (output) await mkdir(output, { recursive: true });
    for (const language of ['fr', 'en']) for (const dark of [false, true]) for (const width of [390, 1280]) for (const scale of [1, 2]) {
      await page.setViewportSize({ width, height: 1100 });
      await page.evaluate(language => localStorage.setItem('lang', language), language);
      await page.reload();
      await drawer.waitFor();
      // Staff web is light-only today; exercise dark token compatibility as a review fixture.
      await page.evaluate(({ colors, scale }) => {
        for (const [name, hex] of Object.entries(colors)) {
          const [r, g, b] = (hex as string).slice(1).match(/../g)!.map(v => parseInt(v, 16) / 255);
          const max = Math.max(r, g, b), min = Math.min(r, g, b), d = max - min;
          const l = (max + min) / 2;
          const s = d === 0 ? 0 : d / (1 - Math.abs(2 * l - 1));
          const h = d === 0 ? 0 : ((max === r ? ((g - b) / d + 6) % 6 : max === g ? (b - r) / d + 2 : (r - g) / d + 4) * 60);
          document.documentElement.style.setProperty(`--${name}`, `${h} ${s * 100}% ${l * 100}%`);
        }
        document.documentElement.style.fontSize = `${16 * scale}px`;
      }, { colors: palettes[dark ? 'dark' : 'light'], scale });
      await page.evaluate(() => document.fonts.ready);
      await page.waitForTimeout(300);
      assert.equal(await page.locator('html').getAttribute('lang'), language);
      assert(await drawer.locator('time').first().innerText().then(value => language === 'fr' ? value.includes('oct.') : value.includes('Oct')));
      const bubbles = drawer.locator('[data-direction]');
      assert.equal(await bubbles.count(), 2);
      assert.equal(await bubbles.nth(0).getAttribute('data-direction'), 'incoming');
      assert.equal(await bubbles.nth(1).getAttribute('data-direction'), 'outgoing');
      for (const bubble of await bubbles.all()) {
        assert(await bubble.evaluate(el => el.scrollWidth <= el.clientWidth + 1), 'Message content must wrap');
        const label = await bubble.getAttribute('aria-label');
        assert(label?.includes(await bubble.locator('h4').innerText()), 'Description identifies the actual author');
        assert(label?.includes(await bubble.locator('time').innerText()), 'Description includes localized time');
        const contrast = await bubble.evaluate(el => {
          const luminance = (color: string) => {
            const rgb = color.match(/[\d.]+/g)!.slice(0, 3).map(v => Number(v) / 255).map(v => v <= .04045 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4);
            return .2126 * rgb[0] + .7152 * rgb[1] + .0722 * rgb[2];
          };
          const foreground = luminance(getComputedStyle(el.querySelector('time')!).color);
          const background = luminance(getComputedStyle(el).backgroundColor);
          return (Math.max(foreground, background) + .05) / (Math.min(foreground, background) + .05);
        });
        assert(contrast >= 4.5, `Small message text contrast: ${contrast}`);
      }
      if (output) await page.screenshot({ path: `${output}/${view}-${language}-${dark ? 'dark' : 'light'}-${width}-${scale}x.png` });
      if (output) await drawer.locator('.conversation-thread').screenshot({ path: `${output}/${view}-${language}-${dark ? 'dark' : 'light'}-${width}-${scale}x-history.png` });
    }
    await page.evaluate(() => localStorage.setItem('lang', 'en'));
    await page.reload();
    await drawer.waitFor();
    await page.setViewportSize({ width: 390, height: 900 });
  }

  for (const width of [1280, 390]) {
    await page.setViewportSize({ width, height: 900 });
    await page.waitForTimeout(100);
    const bounds = await drawer.boundingBox();
    assert(bounds && bounds.width <= (width === 1280 ? 641 : 391), 'Drawer width follows the responsive pattern');
    assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'No horizontal overflow');
  }
  await drawer.getByRole('button', { name: 'Reply', exact: true }).click();
  await page.getByLabel('Message', { exact: true }).fill('Our draft answer');
  version = 2;
  await page.getByRole('button', { name: 'Send', exact: true }).click();
  await page.getByText('Review conversation', { exact: true }).waitFor();
  assert.equal(await page.getByLabel('Message', { exact: true }).inputValue(), 'Our draft answer');
  assert.equal(sent[0].expectedVersion, 1);
  assert(await page.getByRole('button', { name: 'Send', exact: true }).isDisabled());
  await page.getByRole('button', { name: 'Review conversation', exact: true }).click();
  await drawer.getByText('A newer staff answer', { exact: true }).waitFor();
  await drawer.getByRole('button', { name: 'Reply', exact: true }).click();
  await page.getByRole('button', { name: 'Send', exact: true }).click();
  
 await drawer.getByRole('button', { name: 'Mark resolved', exact: true }).waitFor();
  assert.equal(sent[1].expectedVersion, 2);
  await drawer.getByRole('button', { name: 'Mark resolved', exact: true }).click();
  await drawer.getByText('Resolved', { exact: true }).first().waitFor();
  await captureThread('school');
  destination = 'teacher';
  await page.evaluate(async () => {
    const modules = (path: string) => import(/* @vite-ignore */ path);
 const { appGoto, appPath } = await modules('/src/lib/navigation/app-navigation.ts');
    await appGoto(appPath('/school/messages/thread?view=teacher'));
  });
  await drawer.getByText(/School oversight/).waitFor();
  await captureThread('oversight');
  assert.equal(await drawer.getByRole('button', { name: 'Reply', exact: true }).count(), 0);
  destination = 'school';
  edgeCase = true;
  await page.goto(`${origin}/school/messages/thread`);
  await drawer.waitFor();
  const edgeBubbles = drawer.locator('[data-direction]');
  assert.deepEqual(await edgeBubbles.evaluateAll(elements => elements.map(el => el.getAttribute('data-direction'))), ['incoming', 'outgoing', 'outgoing']);
  assert.equal(await edgeBubbles.first().locator('p').innerText(), longBody);
  for (const bubble of await edgeBubbles.all()) {
    assert(await bubble.evaluate(el => el.scrollWidth <= el.clientWidth + 1), 'Long names and 10000-character URLs wrap');
  }

  await page.keyboard.press('Escape');
  await drawer.waitFor({ state: 'hidden' });
  console.log('Staff UI: responsive drawer, stale-reply review, preserved draft, resolution, read-only oversight and Escape passed.');
} finally { await browser.close(); }
