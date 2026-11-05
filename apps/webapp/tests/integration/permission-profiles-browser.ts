import { chooseOption, selectOptions } from './support/custom-select';
import assert from 'node:assert/strict';
import { mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { chromium } from 'playwright';
import { ensurePlaywrightChromium } from '../../scripts/playwright-browsers';
import { apiFetch } from './setup/journey-api';
import { peekOtp, sendOtpThroughUi } from './support/passwordless';
import { verifyPermissionProfileDrawer } from './support/permission-profile-drawer';
import { uiCommand, waitForMutationDialog } from './support/ui-command';

// This journey uses captured authentication and the freshly seeded local demo only.
const base = (process.env.WEBAPP_URL ?? 'http://localhost:5173').replace(/\/+$/, '');
assert(['localhost', '127.0.0.1'].includes(new URL(base).hostname), 'This journey must use a local fixture webapp');
assert(['localhost', '127.0.0.1'].includes(new URL(process.env.API_URL ?? 'http://localhost:9999').hostname), 'This journey must use a local fixture API');
const artifacts = process.env.INTEGRATION_ARTIFACT_DIR ?? resolve(import.meta.dirname, '../../.focused-run/permission-profiles');
mkdirSync(artifacts, { recursive: true });
const schoolId = 'sch-edaya-ci-cocody';
const staffId = 'ci-st4';
const profileId = `permission-browser-${crypto.randomUUID()}`;
const secondProfileId = `${profileId}-second`;
let secondProfileSaved = false;
let secondBindingSaved = false;
let manualId = '';
const displayAssignmentIds: string[] = [];
let createdStaffId = '';
let createdBinding = false;
ensurePlaywrightChromium();
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();
page.setDefaultTimeout(30_000);
const errors: string[] = [];
page.on('pageerror', error => errors.push(error.message));
page.on('response', (response) => {
	if (response.status() >= 400)
		console.log('Permission UI request failed:', response.status(), new URL(response.url()).pathname);
});
let year = '';
let originalDefaults: unknown[] = [];
let bindingSaved = false;
let manualSaved = false;
let profileSaved = false;
let defaultsChanged = false;
async function request(path: string, data: unknown, method = 'POST') {
	const response = await apiFetch(page, base, `/core/${path}`, { method, data, headers: { 'x-actor-kind': 'staff' }, schoolId, academicYearId: year });
	assert(response.ok(), `${path}: HTTP ${response.status()} ${(await response.text()).slice(0, 200)}`);
	return await response.json() as any;
}
async function open(modal: string, target = '') {
	await page.goto(`${base}/school/staff/${staffId}/permissions?modal=${modal}${target ? `&modalTarget=${target}` : ''}`);
	await page.locator('[role="dialog"]:not(.ui-drawer)').waitFor();
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
	await page.route(pattern, async (route) => {
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
	await request('commands/configure-permission-profile', { id: profileId, schoolId, name: profileId, permissions: ['STAFF_READ', 'GRADE_MANAGE'] });
	profileSaved = true;
	await verifyPermissionProfileDrawer(page, base, profileId);
	const emptyId = `${profileId}-empty`;
	let emptyExists = false;
	try {
		await request('commands/configure-permission-profile', { id: emptyId, schoolId, name: emptyId, permissions: [] });
		emptyExists = true;
		await page.goto(`${base}/configuration/permission-profiles/${emptyId}?q=${emptyId}`);
		const emptyDrawer = page.getByTestId('permission-profile-drawer');
		await emptyDrawer.waitFor();
		await emptyDrawer.getByText(/No permissions in this profile|Ce profil ne contient aucune permission/).waitFor();
		await emptyDrawer.getByRole('button', { name: /more actions|plus d.actions/i }).click();
		await page.getByRole('button', { name: /^(delete|supprimer)$/i }).click();
		const confirm = page.getByTestId('confirm-modal');
		await confirm.waitFor();
		const deleted = page.waitForResponse(response => response.url().includes('/entities/staff-permission-profiles/delete'));
		await confirm.getByRole('button', { name: /^(delete|supprimer)$/i }).click();
		assert((await deleted).ok());
		emptyExists = false;
		await emptyDrawer.waitFor({ state: 'hidden' });
		await page.waitForURL(url => url.pathname === '/configuration/permission-profiles' && !url.searchParams.has('modal'));
		assert.equal(new URL(page.url()).searchParams.get('q'), emptyId);
	}
	finally {
		if (emptyExists)
			await request('entities/staff-permission-profiles/delete', { id: emptyId });
	}

	// Start from the staff list before any Permissions tab has populated its catalog.
	await page.route('**/authorization/permission-catalog', route => route.abort(), { times: 1 });
	await page.goto(`${base}/school/staff?modal=create`);
	const creation = page.locator('[role="dialog"]:not(.ui-drawer)');
	await creation.getByRole('alert').waitFor();
	assert(await creation.locator('select[data-control-target]').isDisabled());
	await creation.getByRole('button', { name: /try again|réessayer/i }).click();
	await chooseOption(creation.locator('select[data-control-target]'), profileId);
	assert.equal(await creation.locator('[data-scope-grain="class_group"]').count(), 1, 'Mixed profile must offer class scope on a cold page');
	await creation.getByRole('textbox', { name: /^(first name|prénom)$/i }).fill('Permission');
	await creation.getByRole('textbox', { name: /^(last name|nom)$/i }).fill('Regression');
	await creation.locator('#staff-send-invite').uncheck();
	await creation.locator('[data-scope-grain="class_group"] summary').click();
	await creation.locator('[data-scope-grain="class_group"]').getByRole('checkbox').check();
	const createdResponse = page.waitForResponse(response => response.url().endsWith('/commands/register-staff-member'));
	const appliedResponse = page.waitForResponse(response => response.url().endsWith('/commands/apply-staff-permission-profile'));
	await page.getByTestId('form-modal-submit').click();
	createdStaffId = (await (await createdResponse).json()).id;
	await appliedResponse; createdBinding = true;
	await waitForMutationDialog(page);
	const createdGrants = await request('entities/staff-permission-assignments/list', { staffId: createdStaffId, academicYearId: year });
	assert.deepEqual(createdGrants.map((row: any) => row.permission).sort(), ['GRADE_MANAGE', 'STAFF_READ']);
	await page.goto(`${base}/school/staff/${createdStaffId}/permissions`);
	const emptyAdditional = page.getByTestId('staff-additional-permissions');
	await emptyAdditional.waitFor();
	assert.match(await emptyAdditional.getByTestId('additional-permission-count').innerText(), /^0 /);
	assert.equal(await emptyAdditional.locator('button[aria-expanded]').getAttribute('aria-expanded'), 'false');
	await emptyAdditional.locator('button[aria-expanded]').press('Enter');
	assert(await emptyAdditional.getByText(/no permissions|aucune permission/i).isVisible());


	await open('default-scopes');
	assert.equal(await page.locator('[role="dialog"]:not(.ui-drawer)').getByText(/Whole school|Toute l.école/i).count(), 0);
	assert.equal(await page.locator('[data-scope-grain="class_subject"]').count(), 0);
	const subjectSection = page.locator('[role="dialog"]:not(.ui-drawer)').locator('[data-scope-grain="subject"]');
	await subjectSection.locator('summary').click();
	await subjectSection.getByRole('button', { name: /add.*scope|ajouter.*périmètre/i }).click();
	const classes = await request('entities/class-groups/list', { academicYearId: year });
	const firstClass = classes[0];
	const otherGrade = classes.find((row: any) => row.gradeLevelId !== firstClass.gradeLevelId);
	assert(firstClass && otherGrade);
	await chooseOption(subjectSection.locator('select').nth(0), firstClass.gradeLevelId);
	await chooseOption(subjectSection.locator('select').nth(2), 'selected');
	await chooseOption(subjectSection.locator('select').nth(3), firstClass.id);
	const subjectOptions = await subjectSection.locator('select').nth(1).locator('option').evaluateAll(options => options.map(option => (option as HTMLOptionElement).value).filter(Boolean));
	assert(subjectOptions.length);
	await chooseOption(subjectSection.locator('select').nth(1), subjectOptions[0]);
	assert.equal(await subjectSection.locator('select').nth(3).inputValue(), firstClass.id, 'Changing Subject preserves the class restriction');
	await page.screenshot({ path: resolve(artifacts, 'unified-subject-picker.png') });
	await chooseOption(subjectSection.locator('select').nth(0), otherGrade.gradeLevelId);
	assert.equal(await subjectSection.locator('select').nth(2).inputValue(), 'selected', 'Changing grade never broadens to all classes');
	assert.equal(await subjectSection.locator('select').nth(3).inputValue(), '');
	assert(await page.getByTestId('form-modal-submit').isDisabled());
	await subjectSection.getByRole('button', { name: /^(remove|retirer)$/i }).click();
	const group = page.locator('[role="dialog"]:not(.ui-drawer)').locator('[data-scope-grain="class_group"]');
	await group.locator('summary').click();
	await group.getByRole('checkbox').check();
	await staleReview('configure-staff-permission-scope-defaults', () => group.getByRole('checkbox').uncheck());
	await group.getByRole('checkbox').check();
	await review('configure-staff-permission-scope-defaults');
	assert.deepEqual((await request('entities/staff-permission-scope-defaults/list', { staffId, academicYearId: year }))[0]?.scopes ?? [], originalDefaults, 'Preview must not save defaults');
	const defaults = await save('configure-staff-permission-scope-defaults');
	defaultsChanged = true;
	assert.deepEqual(defaults.scopes.map((scope: unknown) => JSON.stringify(scope)).sort(), [JSON.stringify({ kind: 'all', grain: 'class_group' })].sort());
	assert.equal(await page.getByTestId('staff-default-scopes').getByTestId('scope-tag').count(), 1, 'Default selections must be visible after saving');

	await open('apply-profile');
	await chooseOption(page.locator('#apply-profile-select'), profileId);
	assert(await page.locator('[role="dialog"]:not(.ui-drawer)').getByRole('checkbox').first().isChecked());
	await staleReview('apply-staff-permission-profile', () => page.locator('[role="dialog"]:not(.ui-drawer)').getByRole('checkbox').first().uncheck());
	await page.locator('[role="dialog"]:not(.ui-drawer)').getByRole('checkbox').first().check();
	const appliedPreview = await review('apply-staff-permission-profile');
	assert.equal(appliedPreview.resolution.changes.filter((row: any) => row.change === 'added').length, 2);
	assert.equal((await request('entities/staff-permission-profile-bindings/list', { staffId, profileId, academicYearId: year })).length, 0);
	const binding = await save('apply-staff-permission-profile');
	bindingSaved = true;
	assert.deepEqual(binding.customScopes, []);
	assert.equal(binding.useDefaultScopes, true);

	// Explicit display fixtures keep this journey independent of seeded manual grants.
	for (const [permission, classGroupId] of [['GRADE_SCALE_CONFIGURE', ''], ['ASSESSMENT_READ', 'ci-3a'], ['ASSESSMENT_READ', 'ci-4a']]) {
		const id = `permission-display-${crypto.randomUUID()}`;
		await request('commands/assign-staff-permission', { id, staffId, schoolId, academicYearId: year, permission, status: 'active', useDefaultScopes: false, customScopes: classGroupId ? [{ kind: 'class_group', classGroupId }] : [] });
		displayAssignmentIds.push(id);
	}
	// Two independent disclosures; duplicate grants yield one tag per typed scope.
	await request('commands/configure-permission-profile', { id: secondProfileId, schoolId, name: secondProfileId, permissions: ['STAFF_READ', 'GRADE_MANAGE'] });
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
	const additional = page.getByTestId('staff-additional-permissions');
	const additionalToggle = additional.locator('button[aria-expanded]');
	assert.equal(await additionalToggle.getAttribute('aria-expanded'), 'false', 'Changing staff resets additional expansion');
	assert.equal(await additional.locator('[data-permission-category]:visible').count(), 0);
	await additionalToggle.press('Space');
	assert.equal(await additionalToggle.getAttribute('aria-expanded'), 'true');
	const assignmentIds = await additional.locator('[data-assignment-id]').evaluateAll(rows => rows.map(row => row.getAttribute('data-assignment-id')));
	assert.equal(new Set(assignmentIds).size, assignmentIds.length, 'Every manual grant retains its own row');
	assert.equal(await additional.locator('li[data-permission="ASSESSMENT_READ"]').count(), 2, 'Repeated permissions remain separate assignments');
	assert.equal(await disclosure.getAttribute('aria-expanded'), 'false', 'Additional card must not open profiles');

	assert.equal(await card.getByTestId('scope-tag').count(), 1);
	assert.equal(await second.getByTestId('scope-tag').count(), 0, 'Fully shadowed profiles have no effective scopes');
	await disclosure.focus();
	await page.keyboard.press('Space');
	assert.equal(await disclosure.getAttribute('aria-expanded'), 'true');
	assert.equal(await card.locator('[data-permission="STAFF_READ"] [data-scope-type]').count(), 0);
	assert.equal(await card.locator('[data-permission="GRADE_MANAGE"] [data-scope-type="class_group"]').count(), 1);
	assert.equal(await second.locator('button[aria-expanded]').getAttribute('aria-expanded'), 'false');
	await second.locator('button[aria-expanded]').click();
	assert.equal(await disclosure.getAttribute('aria-expanded'), 'true', 'Opening another profile must preserve expansion');
	await uiCommand(page, '/commands/reorder-staff-permission-profiles', () => second.getByRole('button', { name: /move.*up|monter/i }).click());
	await second.getByTestId('scope-tag').first().waitFor();
	assert.equal(await card.getByTestId('scope-tag').count(), 0);
	assert.equal(await disclosure.getAttribute('aria-expanded'), 'true', 'Reordering preserves expansion by binding');
	assert.equal(await additionalToggle.getAttribute('aria-expanded'), 'true', 'Same-context mutations preserve additional expansion');
	await uiCommand(page, '/commands/reorder-staff-permission-profiles', () => second.getByRole('button', { name: /move.*down|descendre/i }).click());
	await card.getByTestId('scope-tag').first().waitFor();
	await card.getByRole('button', { name: /^(edit|modifier)$/i }).click();
	await page.locator('[role="dialog"]:not(.ui-drawer)').waitFor();
	await page.keyboard.press('Escape');
	await page.locator('[role="dialog"]:not(.ui-drawer)').waitFor({ state: 'hidden' });
	assert.equal(await disclosure.getAttribute('aria-expanded'), 'true', 'Editing does not toggle disclosure');
	await disclosure.click();
	await second.locator('button[aria-expanded]').click();
	await page.screenshot({ path: resolve(artifacts, 'staff-permissions-desktop.png') });
	await page.setViewportSize({ width: 390, height: 844 });
	await disclosure.click();
	await page.screenshot({ path: resolve(artifacts, 'staff-permissions-mobile.png') });
	assert(await card.evaluate(element => element.scrollWidth <= element.clientWidth), 'Profile content must wrap on mobile');
	assert(await additional.evaluate(element => element.scrollWidth <= element.clientWidth), 'Grouped additional permissions must wrap on mobile');
	assert.equal(await additionalToggle.getAttribute('aria-expanded'), 'true');
	await page.setViewportSize({ width: 1280, height: 900 });
	await page.evaluate(() => localStorage.setItem('lang', 'en'));
	await page.reload();
	await card.getByTestId('scope-tag').first().waitFor();
	assert.deepEqual((await card.getByTestId('scope-tag').allTextContents()).map(text => text.trim()).sort(), ['All classes']);
	await disclosure.click();
	assert.equal((await card.locator('[data-permission="GRADE_MANAGE"] [data-scope-type="class_group"]').textContent())?.trim(), 'Class group');
	await additionalToggle.click();
	const englishCategories = await additional.locator('[data-permission-category] h4').allTextContents();
	assert(englishCategories.length > 0);
	assert(englishCategories.every(label => label !== label.toUpperCase()), 'Category headings use localized sentence case');
	const enlarged = await page.addStyleTag({ content: 'html { font-size: 200% !important; }' });
	assert(await additional.evaluate(element => element.scrollWidth <= element.clientWidth), 'Additional permissions must wrap with enlarged text');
	await page.screenshot({ path: resolve(artifacts, 'staff-additional-permissions-enlarged.png') });
	await enlarged.evaluate(element => element.parentNode?.removeChild(element));
	await page.screenshot({ path: resolve(artifacts, 'staff-permissions-desktop-en.png') });
	await page.evaluate(() => localStorage.setItem('lang', 'fr'));
	await page.reload();
	await card.getByTestId('scope-tag').first().waitFor();
	await additionalToggle.click();
	const frenchCategories = await additional.locator('[data-permission-category] h4').allTextContents();
	assert(frenchCategories.length === englishCategories.length && frenchCategories.some((label, index) => label !== englishCategories[index]), 'Categories translate in French without changing grouping');
	await request('commands/remove-staff-permission-profile', { staffId, profileId: secondProfileId, academicYearId: year });
	secondBindingSaved = false;

	await open('default-scopes');
	await page.locator('[role="dialog"]:not(.ui-drawer)').locator('[data-scope-grain="class_group"]').getByRole('checkbox').uncheck();
	const removedPreview = await review('configure-staff-permission-scope-defaults');
	assert(removedPreview.resolution.changes.some((row: any) => row.permission === 'GRADE_MANAGE' && row.change === 'removed'));
	await save('configure-staff-permission-scope-defaults');
	await page.reload();
	await card.getByTestId('profile-scope-warning-summary').waitFor();
	assert.equal(await disclosure.getAttribute('aria-expanded'), 'false');
	assert.equal(await page.getByTestId('staff-default-scopes').getByTestId('scope-tag').count(), 0);
	await disclosure.click();
	await card.locator('[data-testid="permission-scope-warning"][data-reason="missing_scope"]').first().waitFor();
	const grants = await request('entities/staff-permission-assignments/list', { staffId, academicYearId: year, sourceProfileId: profileId });
	assert.deepEqual(grants.map((row: any) => row.permission), ['STAFF_READ']);

	await open('add-permission');
	await chooseOption(page.locator('#permission-select'), 'STAFF_READ');
	assert.equal(await page.locator('[role="dialog"]:not(.ui-drawer)').locator('details').count(), 0);
	assert.equal(await page.locator('[role="dialog"]:not(.ui-drawer)').getByRole('checkbox').count(), 0);
	await chooseOption(page.locator('#permission-select'), 'GRADE_READ');
	assert.match(await selectOptions(page.locator('#permission-select')).and(page.locator('option[value="GRADE_READ"]')).textContent() ?? '', /Classe|Class group/);
	assert.equal(await page.locator('[role="dialog"]:not(.ui-drawer)').locator('[data-permission="GRADE_READ"] [data-scope-type="class_group"]').count(), 1);
	assert(await page.locator('[role="dialog"]:not(.ui-drawer)').getByRole('checkbox').first().isChecked());
	await staleReview('assign-staff-permission', () => chooseOption(page.locator('#permission-select'), 'GRADE_MANAGE'));
	await chooseOption(page.locator('#permission-select'), 'GRADE_READ');
	const manualPreview = await review('assign-staff-permission');
	assert(manualPreview.resolution.warnings.some((row: any) => row.permission === 'GRADE_READ' && row.reason === 'missing_scope'));
	manualId = (await save('assign-staff-permission')).id;
	manualSaved = true;
	await additional.getByTestId('additional-permission-warning-summary').waitFor();
	assert.equal(await additionalToggle.getAttribute('aria-expanded'), 'false');
	await additionalToggle.press('Enter');
	const manualRow = additional.locator(`[data-assignment-id="${manualId}"]`);
	await manualRow.waitFor();
	assert.equal(await manualRow.locator('..').locator('..').getAttribute('data-permission-category'), 'ASSESSMENT');
	const warnedRows = additional.locator('[data-assignment-id]').filter({ has: page.getByTestId('permission-scope-warning') });
	assert.match(await additional.getByTestId('additional-permission-warning-summary').innerText(), new RegExp(`^${await warnedRows.count()} `));
	await manualRow.getByRole('button', { name: /edit permission|modifier la permission/i }).click();
	await page.locator('[role="dialog"]:not(.ui-drawer)').waitFor();
	assert.equal(new URL(page.url()).searchParams.get('modalTarget'), manualId);
	await page.keyboard.press('Escape');
	await page.locator('[role="dialog"]:not(.ui-drawer)').waitFor({ state: 'hidden' });
	assert.equal(await additionalToggle.getAttribute('aria-expanded'), 'true');
	await manualRow.getByRole('button', { name: /delete|supprimer/i }).click();
	await page.locator('[role="dialog"]:not(.ui-drawer)').waitFor();
	assert.equal(new URL(page.url()).searchParams.get('modalTarget'), manualId);
	await page.keyboard.press('Escape');
	await page.locator('[role="dialog"]:not(.ui-drawer)').waitFor({ state: 'hidden' });

	await open('default-scopes');
	const restored = page.locator('[role="dialog"]:not(.ui-drawer)').locator('[data-scope-grain="class_group"]');
	await restored.locator('summary').click();
	await restored.getByRole('checkbox').check();
	const restorePreview = await review('configure-staff-permission-scope-defaults');
	assert.equal(restorePreview.resolution.changes.filter((row: any) => row.change === 'added').length, 2);
	await save('configure-staff-permission-scope-defaults');
	assert.equal((await request('entities/staff-permission-assignments/list', { staffId, academicYearId: year, sourceManualAssignmentId: manualId })).length, 1);

	await page.goto(`${base}/configuration/permission-profiles?modal=edit&modalTarget=${profileId}`);
	await page.locator('[role="dialog"]:not(.ui-drawer)').waitFor();
	const profileEditor = page.locator('[role="dialog"]:not(.ui-drawer)');
	assert.equal(await profileEditor.locator('[data-permission="STAFF_READ"] [data-scope-type]').count(), 0);
	assert.equal(await profileEditor.locator('[data-permission="GRADE_MANAGE"] [data-scope-type="class_group"]').count(), 1);
	assert.deepEqual(await profileEditor.locator('[data-permission="ATTENDANCE_VALIDATE"] [data-scope-type]').evaluateAll(elements => elements.map(element => element.getAttribute('data-scope-type'))), ['grade_level', 'class_group']);
	await page.screenshot({ path: resolve(artifacts, 'permission-profile-scope-types.png') });
	await page.locator('[role="dialog"]:not(.ui-drawer)').getByRole('checkbox', { checked: true }).first().uncheck();
	await staleReview('configure-permission-profile', () => page.locator('[role="dialog"]:not(.ui-drawer)').locator('input').first().fill(`${profileId}-updated`));
	const profilePreview = await review('configure-permission-profile');
	assert(profilePreview.resolution.changes.some((row: any) => row.change === 'removed'));
	await save('configure-permission-profile');
	await page.reload();
	assert.equal((await request(`entities/staff-permission-profiles/${profileId}`, {}, 'GET')).permissions.length, 1);
	await request('commands/configure-permission-profile', { id: secondProfileId, schoolId, name: secondProfileId, permissions: ['STAFF_READ'] });
	await request('commands/apply-staff-permission-profile', { staffId, profileId: secondProfileId, academicYearId: year, customScopes: [], useDefaultScopes: false });
	secondBindingSaved = true;
	await page.goto(`${base}/school/staff/${staffId}/permissions`);
	const unscopedProfile = page.locator(`[data-testid="staff-permission-profile"][data-profile-id="${secondProfileId}"]`);
	await unscopedProfile.waitFor();
	assert.equal(await unscopedProfile.getByTestId('scope-tag').count(), 0);
	assert.doesNotMatch(await unscopedProfile.textContent() ?? '', /No effective scopes|Aucun périmètre effectif/i);
	const unscopedGrants = await request('entities/staff-permission-assignments/list', { staffId, academicYearId: year });
	assert(unscopedGrants.some((row: any) => row.permission === 'STAFF_READ' && row.sourceProfileId === secondProfileId));
	assert.deepEqual(errors, []);
	console.log('Permission browser checks passed: collapsed disclosures, keyboard controls, scope tags, reorder persistence, legacy redirect, FR/EN and mobile layouts, defaults, previews, profile and manual mutations, and warnings.');
}
catch (error) {
	console.log('Permission UI failure:', error);
	console.log('Permission UI failure URL:', page.url());
	console.log('Permission UI errors:', errors);
	console.log('Permission UI dialog:', await page.locator('[role="dialog"]:not(.ui-drawer)').allTextContents().catch(() => []));
	await page.screenshot({ path: resolve(artifacts, 'staff-permissions-failure.png'), timeout: 5000 }).catch(() => {});
	throw error;
}
finally {
	for (const assignmentId of displayAssignmentIds)
		await request('commands/remove-staff-permission', { assignmentId });
	if (secondBindingSaved)
		await request('commands/remove-staff-permission-profile', { staffId, profileId: secondProfileId, academicYearId: year });
	if (secondProfileSaved)
		await request('entities/staff-permission-profiles/delete', { id: secondProfileId });
	if (createdBinding)
		await request('commands/remove-staff-permission-profile', { staffId: createdStaffId, profileId, academicYearId: year });
	if (createdStaffId)
		await request('entities/staff-members/delete', { id: createdStaffId });
	if (manualSaved)
		await request('commands/remove-staff-permission', { assignmentId: manualId });
	if (bindingSaved)
		await request('commands/remove-staff-permission-profile', { staffId, profileId, academicYearId: year });
	if (profileSaved)
		await request('entities/staff-permission-profiles/delete', { id: profileId });
	if (defaultsChanged)
		await request('commands/configure-staff-permission-scope-defaults', { staffId, academicYearId: year, scopes: originalDefaults });
	await browser.close();
}
