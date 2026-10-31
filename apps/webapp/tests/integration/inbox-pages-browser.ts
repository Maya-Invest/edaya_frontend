import assert from 'node:assert/strict';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { chromium } from 'playwright';
import { ensurePlaywrightChromium } from '../../scripts/playwright-browsers';

ensurePlaywrightChromium();
const origin = process.env.WEBAPP_URL ?? 'http://127.0.0.1:5173';
const apiOrigin = process.env.API_URL ?? 'http://localhost:9999';
assert(['127.0.0.1', 'localhost'].includes(new URL(apiOrigin).hostname), 'Use an isolated local API origin');
const output = process.env.INTEGRATION_ARTIFACT_DIR ?? resolve('.focused-run/inbox-pages-ui');
const browser = await chromium.launch({ headless: true });
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  const requests: { path: string; body: any }[] = [];
  const reads = new Set(['read-notice']);
  let markReads = 0;
  let failList = false;
  let withdrawn = false;
  let restrictedAuthors = false;
  const grants = ['SCHOOL_MESSAGES_READ', 'SCHOOL_MESSAGES_REPLY', 'TEACHER_MESSAGES_REVIEW', 'ANNOUNCEMENT_READ', 'GRADE_READ', 'GRADE_VALIDATE'].map(permission => ({ permission, scopes: [{ kind: 'school' }] }));
  const delivery = (id = 'notice') => ({ id, schoolId: 'school', subjectId: 'login', recipientKind: 'staff', recipientId: 'secretary', ...(id === 'notice' ? { announcementId: 'announcement' } : {}), title: id === 'notice' ? 'Formation numérique — enseignants' : 'Saved personal notification', body: 'Real message body with Frais 100%_ and a very long line '.repeat(10), status: reads.has(id) ? 'read' : 'sent', sentAt: id === 'read-notice' ? null : '2026-10-27T12:00:00Z', readAt: reads.has(id) ? '2026-10-27T13:00:00Z' : null, createdAt: '2026-10-27T12:00:00Z' });
  const correction = (id = 'first') => ({ id, workflow: id === 'third' ? 'report_comments' : 'attendance', title: id === 'third' ? 'Published report comment' : id === 'second' ? 'Class attendance correction' : 'Attendance correction', teacherName: id === 'second' ? '' : 'Ada Teacher', className: '6ème 2', students: id === 'third' ? [] : id === 'second' ? [{ id: 'student', name: 'Robin Student' }, { id: 'another', name: 'Another Student' }] : [{ id: 'student', name: 'Robin Student' }], createdAt: '2026-10-27T12:00:00Z', status: 'pending', version: 1, reason: 'Verify the recorded mark comment', before: { workflow: 'attendance', status: 'absent' }, proposal: { workflow: 'attendance', status: 'present' }, consequences: id === 'second' ? [] : id === 'third' ? ['replace_published_report'] : ['review_discipline_outcomes'], revisions: [] });
  await page.route(`${apiOrigin}/**`, async route => {
    const path = new URL(route.request().url()).pathname;
    const input = route.request().postData() ? route.request().postDataJSON() : {};
    requests.push({ path, body: input });
    let response: any = [];
    let status = 200;
    if (path.endsWith('/access-token')) response = { accessToken: 'fixture.payload.signature', expiresAt: new Date(Date.now() + 3600000).toISOString() };
    if (path.endsWith('/session')) response = { user: { id: 'login', email: 'secretary@example.test' }, account: { id: 'login', identifiers: [] }, session: { id: 'fixture-session' } };
    if (path.endsWith('/methods')) response = { email: true, phone: false };
    if (path.endsWith('/authorization/profiles')) response = { profiles: [{ kind: 'staff', actorId: 'secretary', schoolId: 'school', schoolName: 'Oak School' }] };
    if (path.endsWith('/authorization/effective-grants')) response = { kind: 'staff', actorId: 'secretary', schoolId: 'school', grants };
    if (path.endsWith('/staff-members/secretary')) response = { id: 'secretary', schoolId: 'school', firstName: 'School', lastName: 'Secretary', subjectId: 'login' };
    if (path.endsWith('/staff-members/list')) { response = [{ id: 'author', firstName: 'Jean-Baptiste', lastName: 'Aka' }]; if (restrictedAuthors) { status = 403; response = { message: 'Restricted fixture author' }; } }
    if (path.endsWith('/announcements/list')) response = [{ id: 'announcement', createdBy: 'author' }];
    if (path.endsWith('/onboarding/account-status')) response = { wizardCompleted: true, maxReachedStep: 4, schoolStepSubmitted: true, structureStepSubmitted: true };
    if (path.includes('list-conversations')) response = { items: [], total: 0, unreadCount: 0, offset: 0, limit: 25 };
    if (path.includes('get-app-shell-counts')) response = { activeEnrollmentCountsByClass: {}, studentCount: 0, guardianCount: 0, staffCount: 0, teacherCount: 0 };
    if (path.endsWith('/schools/school')) response = { id: 'school', name: 'Oak School', shortName: 'Oak', timeZone: 'UTC' };
    if (/message-deliveries\/(list|count)$/.test(path)) {
      const rows = [delivery(), delivery('read-notice')].filter(row => (!['sent', 'read'].includes(input.status) || row.status === input.status) && (!input.announcementId || (input.announcementId.$exists ? !!row.announcementId : !row.announcementId)));
      response = path.endsWith('/count') ? { count: rows.length } : rows;
      if (failList) { status = 500; response = { message: 'Test list failure' }; }
    }
    if (path.endsWith('/message-deliveries/outside-page')) response = delivery('outside-page');
    if (path.includes('mark-delivery-read')) { markReads++; reads.add(input.deliveryId); response = delivery(input.deliveryId); }
    if (path.includes('list-teacher-corrections')) response = { items: withdrawn ? [] : [correction(), correction('second'), correction('third')], total: withdrawn ? 0 : 3, filters: { classes: [], teachers: [], students: [] } };
    if (path.includes('get-teacher-correction')) response = { correction: correction(input.correctionId), context: { teacherName: 'Ada Teacher', className: '6ème 2', students: correction(input.correctionId).students }, original: {}, history: [], allowedActions: { approve: true, reject: true, withdraw: true, publish: false } };
    if (path.includes('withdraw-teacher-correction')) { withdrawn = true; response = {}; }
    await route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(response) });
  });
  await page.addInitScript(() => {
    sessionStorage.setItem('edaya:auth-gate', '1');
    if (!localStorage.getItem('lang')) localStorage.setItem('lang', 'en');
    // The new correction column model must not inherit the former packed-cell keys.
    localStorage.setItem('edaya:table-columns:v1:login:school:CorrectionsView', JSON.stringify({ version: 1, keys: ['request', 'context', 'consequences', 'status'] }));
  });
  const table = page.locator('main .ui-table').last();
  const header = page.locator('main .ui-collection-header').last();
  const columns = () => table.getByRole('columnheader').allTextContents().then(labels => labels.map(label => label.trim()).filter(Boolean));
  const columnChoice = (label: string) => page.locator('.ui-popover').getByRole('checkbox', { name: label, exact: true });
  async function customize() { await table.getByTestId('table-columns').click(); await page.getByRole('heading', { name: 'Columns', exact: true }).waitFor(); }
  async function responsiveCaptures(prefix: string) {
    await mkdir(output, { recursive: true });
    for (const language of ['en', 'fr']) for (const width of [390, 1440]) for (const scale of [1, 2]) {
      await page.setViewportSize({ width, height: 1000 });
      await page.getByTestId('language-selector').click();
      await page.getByTestId(`language-option-${language}`).click();
      await page.evaluate(scale => document.documentElement.style.fontSize = `${16 * scale}px`, scale);
      // Sidebar width and popup exits use the shared 200ms transitions.
      await page.waitForTimeout(250);
      const region = page.locator('main .ui-table-container [role=region]').last();
      await region.waitFor();
      assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `${prefix} page fits ${language}/${width}/${scale}`);
      assert.equal((await columns()).length, prefix === 'personal' ? 5 : 6, 'Narrow screens retain the chosen columns');
      const before = await region.evaluate(element => ({ scroll: element.scrollWidth, client: element.clientWidth }));
      if (width === 390) {
        assert(before.scroll > before.client, 'The shared table owns horizontal scrolling');
        await region.focus();
        await page.keyboard.press('ArrowRight');
        await page.waitForFunction(() => (document.querySelector('main .ui-table-container [role=region]')?.scrollLeft ?? 0) > 0);
        await region.evaluate(element => { element.scrollLeft = element.scrollWidth; });
        const utility = await table.locator('th.ui-table-utility').boundingBox();
        const bounds = await region.boundingBox();
        assert(utility && bounds && utility.x >= bounds.x - 1 && utility.x + utility.width <= bounds.x + bounds.width + 1, 'Customize stays pinned inside the scroll viewport');
        await table.getByTestId('table-columns').click();
        const reset = page.getByRole('button', { name: language === 'en' ? 'Reset to defaults' : 'Réinitialiser', exact: true });
        await reset.waitFor();
        const popup = await reset.evaluate(element => element.closest('.ui-popover')?.getBoundingClientRect().toJSON() ?? element.getBoundingClientRect().toJSON());
        assert(popup.x >= -1 && popup.right <= width + 1, 'Column controls remain within the narrow viewport');
        await page.keyboard.press('Escape');
        await reset.waitFor({ state: 'hidden' });
        await region.evaluate(element => { element.scrollLeft = 0; });
      }
      if (scale === 1) await page.screenshot({ path: resolve(output, `${prefix}-${language}-${width}.png`) });
    }
    await page.evaluate(() => document.documentElement.style.fontSize = '16px');
    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.getByTestId('language-selector').click();
    await page.getByTestId('language-option-en').click();
  }

  console.log('Checking personal table, scoped search, explicit reads and column preferences');
  await page.goto(`${origin}/account/inbox/outside-page?status=unread&type=notification`);
  const inbox = page.getByTestId('inbox-message-drawer');
  await inbox.waitFor({ timeout: 20000 });
  assert.equal(markReads, 0);
  await inbox.getByRole('button', { name: 'Mark as read', exact: true }).click();
  await inbox.getByText('Read', { exact: true }).waitFor();
  assert.equal(markReads, 1);
  await page.waitForFunction(() => document.querySelector<HTMLButtonElement>('[data-testid="inbox-message-drawer"] button[aria-label="Close"]')?.disabled === false);
  await page.keyboard.press('Escape');
  await inbox.waitFor({ state: 'hidden' });
  assert(new URL(page.url()).searchParams.get('type') === 'notification');
  await page.goto(`${origin}/account/inbox`);
  await table.locator('[data-entity-id=notice]').waitFor();
  assert.deepEqual(await columns(), ['Subject', 'Sender', 'Type', 'Received', 'Status']);
  const inboxWidths = await table.getByRole('columnheader').evaluateAll(nodes => nodes.map(node => node.getBoundingClientRect().width));
  assert(inboxWidths[0]! > inboxWidths[1]! * 1.5, 'Subject receives its configured larger column weight');
  assert.equal(await table.locator('[data-entity-id=notice] [data-column=sender]').innerText(), 'Jean-Baptiste Aka');
  assert.equal(await table.locator('[data-entity-id=notice] [data-column=status]').innerText(), 'Unread');
  assert.equal(await table.locator('[data-entity-id=read-notice] [data-column=status]').innerText(), 'Read');
  assert.equal(await table.locator('[data-entity-id=read-notice] [data-column=received]').innerText(), 'Not provided', 'Creation time does not impersonate delivery time');
  await customize();
  assert(await columnChoice('Subject').isDisabled());
  await columnChoice('Type').uncheck();
  await page.keyboard.press('Escape');
  await page.reload();
  await table.getByTestId('table-columns').waitFor();
  assert.deepEqual(await columns(), ['Subject', 'Sender', 'Received', 'Status']);
  await customize();
  await page.getByRole('button', { name: 'Reset to defaults', exact: true }).click();
  await page.keyboard.press('Escape');
  await table.locator('[data-entity-id=notice] .ui-record-target').focus();
  await page.keyboard.press('Enter');
  await inbox.waitFor();
  assert.equal(markReads, 1, 'Keyboard inspection does not mark the row read');
  assert(await table.locator('[data-entity-id=notice]').getAttribute('data-open-record') === 'true');
  await page.keyboard.press('Escape');
  await inbox.waitFor({ state: 'hidden' });
  await header.getByTestId('list-search').fill('Frais 100%_');
  const searched = page.waitForResponse(response => response.url().includes('/message-deliveries/list'));
  await header.getByTestId('list-search').press('Enter');
  await page.waitForURL(/search=Frais/);
  await searched;
  const matching = requests.filter(row => row.path.endsWith('/message-deliveries/list')).at(-1)!.body;
  assert.equal(matching.subjectId, 'login'); assert.equal(matching.recipientId, 'secretary');
  assert.deepEqual(matching.$and[1], { $or: [{ title: { $contains: 'Frais 100%_' } }, { body: { $contains: 'Frais 100%_' } }] });
  await responsiveCaptures('personal');
  await header.getByTestId('collection-filter').click();
  await page.getByText('Message type', { exact: true }).waitFor();
  await page.keyboard.press('Escape');
  restrictedAuthors = true;
  await page.reload();
  await table.locator('[data-entity-id=notice] [data-column=sender]').getByText('Restricted', { exact: true }).waitFor();
  restrictedAuthors = false;
  failList = true;
  await page.goto(`${origin}/account/inbox?search=error`);
  await page.getByRole('alert').waitFor();
  assert(await header.getByTestId('list-search').isVisible());

  console.log('Checking correction columns, concise impacts, queue continuity and permitted actions');
  await page.goto(`${origin}/school/corrections`);
  await table.locator('[data-entity-id=first]').waitFor();
  assert.deepEqual(await columns(), ['Request', 'Student / class', 'Requester', 'Workflow', 'Received', 'Status']);
  const correctionWidths = await table.getByRole('columnheader').evaluateAll(nodes => nodes.map(node => node.getBoundingClientRect().width));
  assert(correctionWidths[0]! > correctionWidths[1]! * 1.5, 'Request receives its configured larger column weight');
  assert(!await table.innerText().then(text => text.includes('Verify the recorded mark comment') || text.includes('No additional consequences')));
  assert.equal(await table.locator('[data-entity-id=second] [data-column=requester]').innerText(), 'Not provided');
  assert.equal(await table.locator('[data-entity-id=second] [data-column=target]').innerText(), '2 students\n\n6ème 2');
  assert.equal(await table.locator('[data-entity-id=third] [data-column=target]').innerText(), '6ème 2');
  assert.equal(await table.locator('[data-entity-id=third] [data-column=request]').innerText(), 'Published report comment\n\nPublished report will be replaced');
  assert.equal(await table.locator('[data-entity-id=first] [data-column=status]').innerText(), 'Pending');
  await customize();
  assert(await columnChoice('Request').isDisabled());
  await columnChoice('Workflow').uncheck();
  await page.keyboard.press('Escape');
  await page.reload();
  await table.getByTestId('table-columns').waitFor();
  assert(!await columns().then(labels => labels.includes('Workflow')));
  await customize();
  await page.getByRole('button', { name: 'Show all available', exact: true }).click();
  await page.keyboard.press('Escape');
  await responsiveCaptures('corrections');
  await table.locator('[data-entity-id=first] .ui-record-target').click();
  const drawer = page.getByTestId('correction-drawer');
  await drawer.waitFor();
  await drawer.getByText('Verify the recorded mark comment', { exact: true }).waitFor();
  await drawer.getByRole('button', { name: 'Approve correction', exact: true }).waitFor();
  await drawer.getByRole('button', { name: 'Reject correction', exact: true }).waitFor();
  await drawer.getByRole('button', { name: 'Open next pending request', exact: true }).click();
  await page.waitForURL(/correction=second/);
  await drawer.getByRole('button', { name: 'Back', exact: true }).click();
  await page.waitForURL(/correction=first/);
  await drawer.getByRole('button', { name: 'Open next pending request', exact: true }).click();
  await page.waitForURL(/correction=second/);
  await drawer.getByRole('button', { name: 'More actions', exact: true }).click();
  await page.getByRole('button', { name: 'Withdraw request', exact: true }).click();
  const modal = page.getByRole('dialog').filter({ has: page.getByText('Withdraw this correction request?', { exact: false }) });
  await modal.getByRole('button', { name: 'Save changes', exact: true }).click();
  await drawer.waitFor({ state: 'hidden' });
  const command = requests.find(row => row.path.includes('withdraw-teacher-correction'));
  assert.equal(command?.body.correctionId, 'second');
  assert.equal(command?.body.expectedVersion, 1);
  assert.equal(command?.body.confirmConsequences, true);
  await writeFile(resolve(output, 'capture-conditions.json'), JSON.stringify({ tokenVersion: JSON.parse(await readFile(resolve('../../design-system/tokens.json'), 'utf8')).version, locales: ['en', 'fr'], viewportWidths: [390, 1440], viewportHeight: 1000, textScales: [1, 2], capturedTextScale: 1, source: 'execution.json', data: 'isolated fixture APIs' }, null, 2));
  assert.deepEqual(errors, []);
  console.log('PASS: both tables, persisted column selection/reset, legacy preference isolation, scoped search, explicit reads, missing/restricted data, concise impacts, drawers and FR/EN mobile/desktop 200% reflow');
} catch (error) {
  console.error(error);
  for (const page of browser.contexts().flatMap(context => context.pages())) console.error((await page.locator('body').innerText()).slice(-5000));
  throw error;
} finally { await browser.close(); }
