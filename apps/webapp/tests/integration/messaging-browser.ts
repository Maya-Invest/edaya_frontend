import assert from 'node:assert/strict';
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
  let version = 1;
  let destination = 'school';
  let status = 'awaiting_school';
  const sent: Record<string, unknown>[] = [];
  const summary = () => ({ id: 'thread', schoolId: 'school', guardianId: 'guardian', destination,
    studentName: 'Robin', guardianName: 'Sam Parent', schoolName: 'Oak School', teacherName: 'Ada Teacher',
    subject: 'Opening hours', status, version, lastSequence: version, unread: true, lastMessage: 'When do you open?',
    updatedAt: '2026-10-04T12:00:00Z', allowedActions: { reply: destination === 'school', resolve: destination === 'school', reason: null } });
  const detail = () => ({ conversation: summary(), messages: [{ id: 'message1', sequence: 1,
    authorKind: 'guardian', authorName: 'Sam Parent', createdAt: '2026-10-04T12:00:00Z', body: 'When do you open?' },
    ...(version > 1 ? [{ id: 'message2', sequence: 2, authorKind: 'staff', authorName: 'Other Secretary', createdAt: '2026-10-04T12:05:00Z', body: 'A newer staff answer' }] : [])], hasMore: false });
  await page.route(`${apiOrigin}/auth/**`, async route => {
    const token = route.request().url().includes('access-token');
    await route.fulfill({ status: token ? 200 : 401, contentType: 'application/json', headers: { 'access-control-allow-origin': origin, 'access-control-allow-credentials': 'true', 'access-control-allow-methods': 'GET,POST,OPTIONS', 'access-control-allow-headers': 'content-type,authorization,accept-language,x-actor-id,x-actor-kind,x-school-id,x-academic-year-id' }, body: JSON.stringify(token ? { accessToken: 'test-header.test-payload.test-signature', expiresAt: new Date(Date.now() + 3600000).toISOString() } : {}) });
  });
  await page.route(`${apiOrigin}/core/**`, async route => {
    const url = route.request().url();
    const input = route.request().postDataJSON() ?? {};
    let body: unknown = [];
    let code = 200;
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
  await page.goto(`${origin}/login`);
  await page.waitForTimeout(800);
  await page.evaluate(async () => {
    const modules = (path: string) => import(/* @vite-ignore */ path);
    const { bootstrapSession } = await modules('/src/lib/auth/bootstrap.ts');
 await bootstrapSession();
 const { authSession } = await modules('/src/lib/auth/session.svelte.ts');
    const { lang } = await modules('/src/lib/i18n/index.ts');
    lang.set('en');
    sessionStorage.setItem('edaya:auth-gate', '1');
    Object.assign(authSession, { userId: 'secretary', subjectId: 'login', authUserId: 'login', schoolId: 'school', sessionKind: 'staff', needsOnboarding: false, onboardingStatusUnknown: false, ready: true, userProfile: { id: 'secretary', firstName: 'School', lastName: 'Secretary', name: 'School Secretary', role: 'staff', subjectId: 'login' },
      grants: ['SCHOOL_MESSAGES_READ','SCHOOL_MESSAGES_REPLY','TEACHER_MESSAGES_REVIEW'].map(permission => ({ permission, scopes: [{kind:'school'}] })) });
    const { appGoto, appPath } = await modules('/src/lib/navigation/app-navigation.ts');
    await appGoto(appPath('/school/messages/thread'));
  });
  
 const drawer = page.getByRole('dialog').filter({ has: page.getByText('Opening hours', { exact: true }) });
  await drawer.waitFor();
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
  destination = 'teacher';
  await page.evaluate(async () => {
    const modules = (path: string) => import(/* @vite-ignore */ path);
 const { appGoto, appPath } = await modules('/src/lib/navigation/app-navigation.ts');
    await appGoto(appPath('/school/messages/thread?view=teacher'));
  });
  await drawer.getByText(/School oversight/).waitFor();
  assert.equal(await drawer.getByRole('button', { name: 'Reply', exact: true }).count(), 0);
  await page.keyboard.press('Escape');
  await drawer.waitFor({ state: 'hidden' });
  console.log('Staff UI: responsive drawer, stale-reply review, preserved draft, resolution, read-only oversight and Escape passed.');
} finally { await browser.close(); }
