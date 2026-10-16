import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import { ensurePlaywrightChromium } from '../../scripts/playwright-browsers';
import { peekOtp, sendOtpThroughUi } from './support/passwordless';
import { apiFetch } from './setup/journey-api';
import { uiCommand, waitForMutationDialog } from './support/ui-command';

// This journey uses captured authentication and the freshly seeded local demo only.
const base = (process.env.WEBAPP_URL ?? 'http://localhost:5173').replace(/\/+$/, '');
assert(['localhost', '127.0.0.1'].includes(new URL(base).hostname), 'This journey must use a local fixture webapp');
assert(['localhost', '127.0.0.1'].includes(new URL(process.env.API_URL ?? 'http://localhost:9999').hostname), 'This journey must use a local fixture API');
const schoolId = 'sch-edaya-ci-cocody';
const staffId = 'ci-st4';
const profileId = `permission-browser-${crypto.randomUUID()}`;
const secondProfileId = `${profileId}-second`;
let secondProfileSaved = false;
let secondBindingSaved = false;
let manualId = '';
let createdStaffId = '';
let createdBinding = false;
ensurePlaywrightChromium();
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();
page.setDefaultTimeout(30_000);
const errors: string[] = [];
page.on('pageerror', error => errors.push(error.message));
page.on('response', response => { if (response.status() >= 400) console.log('Permission UI request failed:', response.status(), new URL(response.url()).pathname); });
let year = '';
let originalDefaults: unknown[] = [];
let bindingSaved = false;
let manualSaved = false;
let profileSaved = false;
let defaultsChanged = false;
async function request(path: string, data: unknown, method = 'POST') {
  const response = await apiFetch(page, base, `/core/${path}`, { method, data, schoolId, academicYearId: year });
  assert(response.ok(), `${path}: HTTP ${response.status()} ${(await response.text()).slice(0, 200)}`);
  return await response.json() as any;
}
async function open(modal: string, target = '') {
  await page.goto(`${base}/school/staff/${staffId}/permissions?modal=${modal}${target ? `&modalTarget=${target}` : ''}`);
  await page.getByRole('dialog').waitFor();
  await page.getByTestId('form-modal-submit').waitFor();
}
async function review(path: string) {
  console.log(`Permission UI: ${path}`);
  const response = await uiCommand(page, `/commands/${path}`, () => page.getByTestId('form-modal-submit').click());
  assert.equal(response.request().postDataJSON().previewOnly, true);
  await page.getByTestId('form-modal-submit').getByText(/save|enregistrer/i).waitFor();
  return await response.json() as any;
}
async function save(path: string) {
  console.log(`Permission UI: ${path}`);
  const response = await uiCommand(page, `/commands/${path}`, () => page.getByTestId('form-modal-submit').click());
  assert.notEqual(response.request().postDataJSON().previewOnly, true, `${path} must commit after review`);
  await waitForMutationDialog(page);
  return await response.json() as any;
}
async function staleReview(path: string, edit: () => Promise<unknown>) {
  let release!: () => void;
  let arrived!: () => void;
  const gate = new Promise<void>(resolve => release = resolve);
  const started = new Promise<void>(resolve => arrived = resolve);
  const pattern = `**/commands/${path}`;
  await page.route(pattern, async route => {
    const response = await route.fetch();
    arrived(); await gate;
    await route.fulfill({ response });
  }, { times: 1 });
  await page.getByTestId('form-modal-submit').click();
  await started; await edit(); release();
  await page.waitForResponse(response => response.url().endsWith(`/commands/${path}`));
  console.log('Stale preview button:', await page.getByTestId('form-modal-submit').textContent());
  await page.getByTestId('form-modal-submit').getByText(/review|examiner|vérifier|revoir/i).waitFor();
  assert.equal(await page.getByTestId('form-modal-submit').getByText(/save|enregistrer/i).count(), 0, 'Stale preview must not enable Save');
  await page.unroute(pattern);
}
try {
  await page.goto(`${base}/login?panel=signin&method=email-otp&stage=form`);
  const sent = page.waitForResponse(response => response.url().endsWith('/auth/edaya/otp/start'));
  await sendOtpThroughUi(page, 'a.kone@ecole-ci.edaya.dev');
  const { challenge } = await (await sent).json();
  const code = await peekOtp('a.kone@ecole-ci.edaya.dev', 'email', challenge);
  await page.locator('[data-testid="auth-code"]:visible').fill(code);
  await page.locator('[data-testid="auth-submit"]:visible').click();
  await page.waitForURL(/\/dashboard/);
  await page.goto(`${base}/dashboard`);
  await page.locator('aside#app-sidebar').waitFor();
  await page.waitForFunction(() => Boolean(document.querySelector('[data-testid="academic-year-trigger"]')?.getAttribute('data-year-id')));
  year = await page.getByTestId('academic-year-trigger').getAttribute('data-year-id') ?? '';
  assert(year);
  originalDefaults = (await request('entities/staff-permission-scope-defaults/list', { staffId, academicYearId: year }))[0]?.scopes ?? [];
  await request('commands/configure-permission-profile', { id: profileId, schoolId, name: profileId, permissions: ['PAYMENT_READ', 'GRADE_INPUT'] });
  profileSaved = true;

  // Start from the staff list before any Permissions tab has populated its catalog.
  await page.route('**/authorization/permission-catalog', route => route.abort(), { times: 1 });
  await page.goto(`${base}/school/staff?modal=create`);
  const creation = page.getByRole('dialog');
  await creation.getByRole('alert').waitFor();
  assert(await creation.locator('select').isDisabled());
  await creation.getByRole('button', { name: /try again|réessayer/i }).click();
  await creation.locator('select').selectOption(profileId);
  assert.equal(await creation.locator('details').count(), 1, 'Mixed profile must offer class scope on a cold page');
  await creation.locator('input').nth(0).fill('Permission');
  await creation.locator('input').nth(1).fill('Regression');
  await creation.locator('#staff-send-invite').uncheck();
  await creation.getByRole('checkbox').nth(1).check();
  await creation.locator('summary').click();
  await creation.locator('details').getByRole('checkbox').check();
  const createdResponse = page.waitForResponse(response => response.url().endsWith('/commands/register-staff-member'));
  const appliedResponse = page.waitForResponse(response => response.url().endsWith('/commands/apply-staff-permission-profile'));
  await page.getByTestId('form-modal-submit').click();
  createdStaffId = (await (await createdResponse).json()).id;
  await appliedResponse; createdBinding = true;
  await waitForMutationDialog(page);
  const createdGrants = await request('entities/staff-permission-assignments/list', { staffId: createdStaffId, academicYearId: year });
  assert.deepEqual(createdGrants.map((row: any) => row.permission).sort(), ['GRADE_INPUT', 'PAYMENT_READ']);

  await open('default-scopes');
  await page.getByRole('dialog').getByRole('checkbox').first().check();
  const group = page.getByRole('dialog').locator('details').first();
  await group.locator('summary').click();
  await group.getByRole('checkbox').check();
  await staleReview('configure-staff-permission-scope-defaults', () => page.getByRole('dialog').getByRole('checkbox').first().uncheck());
  await page.getByRole('dialog').getByRole('checkbox').first().check();
  await review('configure-staff-permission-scope-defaults');
  assert.deepEqual((await request('entities/staff-permission-scope-defaults/list', { staffId, academicYearId: year }))[0]?.scopes ?? [], originalDefaults, 'Preview must not save defaults');
  const defaults = await save('configure-staff-permission-scope-defaults');
  defaultsChanged = true;
  assert.deepEqual(defaults.scopes.map((scope: unknown) => JSON.stringify(scope)).sort(), [JSON.stringify({ kind: 'school' }), JSON.stringify({ kind: 'all', grain: 'class_group' })].sort());
  assert.equal(await page.getByTestId('staff-default-scopes').getByTestId('scope-tag').count(), 2, 'Default selections must be visible after saving');

  await open('apply-profile');
  await page.locator('#apply-profile-select').selectOption(profileId);
  assert(await page.getByRole('dialog').getByRole('checkbox').first().isChecked());
  await staleReview('apply-staff-permission-profile', () => page.getByRole('dialog').getByRole('checkbox').first().uncheck());
  await page.getByRole('dialog').getByRole('checkbox').first().check();
  const appliedPreview = await review('apply-staff-permission-profile');
  assert.equal(appliedPreview.resolution.changes.filter((row: any) => row.change === 'added').length, 2);
  assert.equal((await request('entities/staff-permission-profile-bindings/list', { staffId, profileId, academicYearId: year })).length, 0);
  const binding = await save('apply-staff-permission-profile');
  bindingSaved = true;
  assert.deepEqual(binding.customScopes, []);
  assert.equal(binding.useDefaultScopes, true);

  // Two independent disclosures; duplicate grants yield one tag per typed scope.
  await request('commands/configure-permission-profile', { id: secondProfileId, schoolId, name: secondProfileId, permissions: ['PAYMENT_READ', 'GRADE_INPUT'] });
  secondProfileSaved = true;
  await request('commands/apply-staff-permission-profile', { staffId, profileId: secondProfileId, academicYearId: year, customScopes: [], useDefaultScopes: true });
  secondBindingSaved = true;
  await page.goto(`${base}/school/staff/${staffId}/assignments?q=permission`);
  await page.waitForURL(url => url.pathname.endsWith('/permissions') && url.searchParams.get('q') === 'permission');
  const card = page.locator(`[data-testid="staff-permission-profile"][data-profile-id="${profileId}"]`);
  const second = page.locator(`[data-testid="staff-permission-profile"][data-profile-id="${secondProfileId}"]`);
  const disclosure = card.locator('button[aria-expanded]');
  await disclosure.waitFor();
  assert.equal(await page.getByTestId('drawer-tab-bar').getByRole('link').count(), 2);
  assert.equal(await page.getByRole('link', { name: /manage permissions|gérer les permissions/i }).count(), 0);
  assert.equal(await disclosure.getAttribute('aria-expanded'), 'false');
  assert.equal(await card.getByTestId('scope-tag').count(), 2);
  assert.equal(await second.getByTestId('scope-tag').count(), 0, 'Fully shadowed profiles have no effective scopes');
  await disclosure.focus();
  await page.keyboard.press('Space');
  assert.equal(await disclosure.getAttribute('aria-expanded'), 'true');
  assert.equal(await card.locator('[data-permission="PAYMENT_READ"] [data-scope-type="school"]').count(), 1);
  assert.equal(await card.locator('[data-permission="GRADE_INPUT"] [data-scope-type="class_group"]').count(), 1);
  assert.equal(await second.locator('button[aria-expanded]').getAttribute('aria-expanded'), 'false');
  await second.locator('button[aria-expanded]').click();
  assert.equal(await disclosure.getAttribute('aria-expanded'), 'true', 'Opening another profile must preserve expansion');
  await uiCommand(page, '/commands/reorder-staff-permission-profiles', () => second.getByRole('button', { name: /move.*up|monter/i }).click());
  await second.getByTestId('scope-tag').first().waitFor();
  assert.equal(await card.getByTestId('scope-tag').count(), 0);
  assert.equal(await disclosure.getAttribute('aria-expanded'), 'true', 'Reordering preserves expansion by binding');
  await uiCommand(page, '/commands/reorder-staff-permission-profiles', () => second.getByRole('button', { name: /move.*down|descendre/i }).click());
  await card.getByTestId('scope-tag').first().waitFor();
  await card.getByRole('button', { name: /^(edit|modifier)$/i }).click();
  await page.getByRole('dialog').waitFor();
  await page.keyboard.press('Escape');
  await page.getByRole('dialog').waitFor({ state: 'hidden' });
  assert.equal(await disclosure.getAttribute('aria-expanded'), 'true', 'Editing does not toggle disclosure');
  await disclosure.click();
  await second.locator('button[aria-expanded]').click();
  await page.screenshot({ path: '/private/tmp/staff-permissions-desktop.png' });
  await page.setViewportSize({ width: 390, height: 844 });
  await disclosure.click();
  await page.screenshot({ path: '/private/tmp/staff-permissions-mobile.png' });
  assert(await card.evaluate(element => element.scrollWidth <= element.clientWidth), 'Profile content must wrap on mobile');
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.evaluate(() => localStorage.setItem('lang', 'en'));
  await page.reload();
  await card.getByTestId('scope-tag').first().waitFor();
  assert.deepEqual((await card.getByTestId('scope-tag').allTextContents()).map(text => text.trim()).sort(), ['All classes', 'Whole school']);
  await disclosure.click();
  assert.equal((await card.locator('[data-permission="GRADE_INPUT"] [data-scope-type]').textContent())?.trim(), 'Class group');
  await page.screenshot({ path: '/private/tmp/staff-permissions-desktop-en.png' });
  await page.evaluate(() => localStorage.setItem('lang', 'fr'));
  await page.reload();
  await card.getByTestId('scope-tag').first().waitFor();
  await request('commands/remove-staff-permission-profile', { staffId, profileId: secondProfileId, academicYearId: year });
  secondBindingSaved = false;


  await open('default-scopes');
  await page.getByRole('dialog').locator('details').first().getByRole('checkbox').uncheck();
  const removedPreview = await review('configure-staff-permission-scope-defaults');
  assert(removedPreview.resolution.changes.some((row: any) => row.permission === 'GRADE_INPUT' && row.change === 'removed'));
  await save('configure-staff-permission-scope-defaults');
  await page.reload();
  await card.getByTestId('profile-scope-warning-summary').waitFor();
  assert.equal(await disclosure.getAttribute('aria-expanded'), 'false');
  assert.equal(await page.getByTestId('staff-default-scopes').getByTestId('scope-tag').count(), 1);
  await disclosure.click();
  await card.locator('[data-testid="permission-scope-warning"][data-reason="missing_scope"]').first().waitFor();
  const grants = await request('entities/staff-permission-assignments/list', { staffId, academicYearId: year, sourceProfileId: profileId });
  assert.deepEqual(grants.map((row: any) => row.permission), ['PAYMENT_READ']);

  await open('add-permission');
  await page.locator('#permission-select').selectOption('GRADE_READ');
  assert.match(await page.locator('#permission-select option[value="GRADE_READ"]').textContent() ?? '', /Classe|Class group/);
  assert.equal(await page.getByRole('dialog').locator('[data-permission="GRADE_READ"] [data-scope-type="class_group"]').count(), 1);
  assert(await page.getByRole('dialog').getByRole('checkbox').first().isChecked());
  await staleReview('assign-staff-permission', () => page.locator('#permission-select').selectOption('GRADE_INPUT'));
  await page.locator('#permission-select').selectOption('GRADE_READ');
  const manualPreview = await review('assign-staff-permission');
  assert(manualPreview.resolution.warnings.some((row: any) => row.permission === 'GRADE_READ' && row.reason === 'missing_scope'));
  manualId = (await save('assign-staff-permission')).id;
  manualSaved = true;
  await open('default-scopes');
  const restored = page.getByRole('dialog').locator('details').first();
  await restored.locator('summary').click();
  await restored.getByRole('checkbox').check();
  const restorePreview = await review('configure-staff-permission-scope-defaults');
  assert.equal(restorePreview.resolution.changes.filter((row: any) => row.change === 'added').length, 2);
  await save('configure-staff-permission-scope-defaults');
  assert.equal((await request('entities/staff-permission-assignments/list', { staffId, academicYearId: year, sourceManualAssignmentId: manualId })).length, 1);

  await page.goto(`${base}/configuration/permission-profiles?modal=edit&modalTarget=${profileId}`);
  await page.getByRole('dialog').waitFor();
  const profileEditor = page.getByRole('dialog');
  assert.equal(await profileEditor.locator('[data-permission="PAYMENT_READ"] [data-scope-type="school"]').count(), 1);
  assert.equal(await profileEditor.locator('[data-permission="GRADE_INPUT"] [data-scope-type="class_group"]').count(), 1);
  assert.deepEqual(await profileEditor.locator('[data-permission="ATTENDANCE_VALIDATE"] [data-scope-type]').evaluateAll(elements => elements.map(element => element.getAttribute('data-scope-type'))), ['school', 'class_group']);
  await page.screenshot({ path: '/private/tmp/permission-profile-scope-types.png' });
  await page.getByRole('dialog').getByRole('checkbox', { checked: true }).first().uncheck();
  await staleReview('configure-permission-profile', () => page.getByRole('dialog').locator('input').first().fill(`${profileId}-updated`));
  const profilePreview = await review('configure-permission-profile');
  assert(profilePreview.resolution.changes.some((row: any) => row.change === 'removed'));
  await save('configure-permission-profile');
  await page.reload();
  assert.equal((await request(`entities/staff-permission-profiles/${profileId}`, {}, 'GET')).permissions.length, 1);
  assert.deepEqual(errors, []);
  console.log('Permission browser checks passed: collapsed disclosures, keyboard controls, scope tags, reorder persistence, legacy redirect, FR/EN and mobile layouts, defaults, previews, profile and manual mutations, and warnings.');
} catch (error) {
  console.log('Permission UI failure:', error);
  console.log('Permission UI failure URL:', page.url());
  console.log('Permission UI errors:', errors);
  console.log('Permission UI dialog:', await page.getByRole('dialog').allTextContents().catch(() => []));
  await page.screenshot({ path: '/private/tmp/staff-permissions-failure.png', timeout: 5000 }).catch(() => {});
  throw error;
} finally {
  if (secondBindingSaved) await request('commands/remove-staff-permission-profile', { staffId, profileId: secondProfileId, academicYearId: year });
  if (secondProfileSaved) await request('entities/staff-permission-profiles/delete', { id: secondProfileId });
  if (createdBinding) await request('commands/remove-staff-permission-profile', { staffId: createdStaffId, profileId, academicYearId: year });
  if (createdStaffId) await request('entities/staff-members/delete', { id: createdStaffId });
  if (manualSaved) await request('commands/remove-staff-permission', { assignmentId: manualId });
  if (bindingSaved) await request('commands/remove-staff-permission-profile', { staffId, profileId, academicYearId: year });
  if (profileSaved) await request('entities/staff-permission-profiles/delete', { id: profileId });
  if (defaultsChanged) await request('commands/configure-staff-permission-scope-defaults', { staffId, academicYearId: year, scopes: originalDefaults });
  await browser.close();
}
