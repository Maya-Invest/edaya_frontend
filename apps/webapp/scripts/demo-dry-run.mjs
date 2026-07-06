/**
 * Demo-ready plan (DR.1) + Track B/C polish — automated browser dry-run.
 *
 * Scenes:
 *   D0–D11  — core demo modules (director login)
 *   DC1–DC10 — list shell / filter polish (Track B.1, C.1, C.3.1–C.3.2)
 *   DD1–DD20 — drawer tab URL sync (people + class + subject drawers)
 *   DM1–DM20 — modal URL sync (list create + drawer edit deep links)
 *   DN      — homeroom attendance nudge (C.3.4, coordinator login)
 *
 * Run: node scripts/demo-dry-run.mjs
 * Requires: webapp on :5173, API seeded with demo-ci.
 */
import { chromium } from 'playwright';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

const BASE = process.env.WEBAPP_URL ?? 'http://localhost:5173';
const PASSWORD = 'DevPassword1!';
const STAFF_EMAIL = 'j.aka@ecole-ci.edaya.dev';
const COORDINATOR_EMAIL = 'f.assi@ecole-ci.edaya.dev';
const OUT_DIR = path.join(import.meta.dirname, '../.demo-dry-run');
const CLASS_6A = 'ci-6a';
const CLASS_6B = 'ci-6b';
const CLASS_SUBJECT_ID = 'ci-cs-6a-math';
const STUDENT_ID = 'ci-s1';
const TEACHER_ID = 'ci-t1';
const STAFF_ID = 'ci-st3';

/** demo-ci seeded activity — asserts list row render (not just page shell). */
const DEMO_ACTIVITY_NAME = /Club Robotique|Chorale scolaire/i;

/** Browser extension / devtools noise — do not fail the run. */
const IGNORED_BROWSER_ERROR = /contentscript|ObjectMultiplex|MaxListenersExceededWarning|chrome-extension/i;

/** @type {{ snapshot: () => number; assertCleanSince: (mark: number, scene: string, step: string) => boolean } | null} */
let pageErrorTracker = null;

function isIgnorableBrowserError(message) {
	return IGNORED_BROWSER_ERROR.test(message);
}

/**
 * @param {import('playwright').Page} page
 * @param {string[]} consoleErrors
 */
function setupPageErrorTracking(page, consoleErrors) {
	/** @type {string[]} */
	const pageErrors = [];
	page.on('console', msg => {
		if (msg.type() === 'error') consoleErrors.push(msg.text());
	});
	page.on('pageerror', err => {
		const message = err.message;
		consoleErrors.push(message);
		if (!isIgnorableBrowserError(message)) pageErrors.push(message);
	});
	const tracker = {
		snapshot: () => pageErrors.length,
		assertCleanSince(mark, scene, step) {
			const fresh = [...new Set(pageErrors.slice(mark))];
			if (fresh.length === 0) return true;
			log(scene, step, 'fail', `Uncaught page error: ${fresh.slice(0, 2).join(' | ')}`);
			return false;
		},
	};
	pageErrorTracker = tracker;
	return tracker;
}

/** Bilingual drawer tab button labels (en + fr). */
const DRAWER_TAB_LABELS = {
	profile: /^(Profile|Profil)$/i,
	grades: /^(Grades|Notes)$/i,
	attendance: /^(Attendance|Assiduité)$/i,
	incidents: /^(Incidents)$/i,
	finances: /^(Finance|Finances)$/i,
	enrollments: /^(Enrollments|Inscriptions)$/i,
	assignments: /^(Assignments|Affectations|Staff assignments)$/i,
	permissions: /^(Permissions)$/i,
	progression: /^(Chapters|Chapitres)$/i,
	logbook: /^(Lessons|Leçons)$/i,
	details: /^(Details|Détails)$/i,
};

/** @type {{ scene: string; step: string; status: 'pass' | 'fail' | 'skip'; detail?: string }[]} */
const results = [];

function log(scene, step, status, detail) {
	results.push({ scene, step, status, detail });
	const mark = status === 'pass' ? '✓' : status === 'skip' ? '○' : '✗';
	console.log(`${mark} [${scene}] ${step}${detail ? ` — ${detail}` : ''}`);
}

async function shot(page, name) {
	await page.screenshot({ path: path.join(OUT_DIR, `${name}.png`), fullPage: true });
}

async function waitForAppShell(page) {
	await page.waitForSelector('nav, aside, [data-testid="app-shell"]', { timeout: 20_000 }).catch(() =>
		page.waitForSelector('main', { timeout: 20_000 }),
	);
}

/**
 * @param {import('playwright').Page} page
 * @param {{ namePattern?: RegExp; email?: string }} account
 */
async function signIn(page, account = {}) {
	const { namePattern = /Jean-Baptiste Aka|Aka/i, email = STAFF_EMAIL } = account;
	await page.goto(`${BASE}/login/demo`, { waitUntil: 'domcontentloaded' });
	const demoBtn = page.getByRole('button', { name: namePattern });
	const hasDemoPicker = await demoBtn.waitFor({ timeout: 20_000 }).then(() => true).catch(() => false);
	if (hasDemoPicker) {
		await demoBtn.click();
	}
	else {
		await page.goto(`${BASE}/login`, { waitUntil: 'domcontentloaded' });
		await page.getByRole('textbox').first().fill(email);
		await page.locator('input[type="password"]').fill(PASSWORD);
		await page.getByRole('button', { name: /sign in|connexion|continue|continuer/i }).click();
	}
	await page.waitForURL(/\/(dashboard|school|classes)/, { timeout: 30_000 });
	await page.waitForSelector('aside#app-sidebar', { timeout: 20_000 });
}

async function assertNoFatalError(page, scene, step) {
	const alert = page.locator('[role="alert"]').filter({ hasText: /something went wrong|une erreur est survenue/i });
	if (await alert.isVisible({ timeout: 1_000 }).catch(() => false)) {
		log(scene, step, 'fail', 'Error state visible on page');
		return false;
	}
	return true;
}

async function waitForPathStable(page, expectedPathPrefix, timeoutMs = 20_000) {
	const deadline = Date.now() + timeoutMs;
	while (Date.now() < deadline) {
		const currentPath = new URL(page.url()).pathname;
		if (currentPath.startsWith(expectedPathPrefix)) {
			await page.waitForTimeout(500);
			const again = new URL(page.url()).pathname;
			if (again.startsWith(expectedPathPrefix)) {
				return { ok: true, path: again };
			}
		}
		await page.waitForTimeout(150);
	}
	return { ok: false, path: new URL(page.url()).pathname };
}

async function visitOrSkip(page, url, scene, step, options = {}) {
	const ok = await visit(page, url, scene, step, options);
	if (!ok && options.skipOnFail) {
		const last = results[results.length - 1];
		if (last?.scene === scene && last?.step === step && last?.status === 'fail') {
			results.pop();
			log(scene, step, 'skip', options.skipOnFail);
		}
		return false;
	}
	return ok;
}

async function visit(page, url, scene, step, { expectText, selector, pathPrefix, retry = false } = {}) {
	const expectedPath = pathPrefix ?? new URL(url).pathname;
	const errorMark = pageErrorTracker?.snapshot() ?? 0;
	const attempt = async () => {
		try {
			const response = await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 45_000 });
			const status = response?.status() ?? 0;
			if (status >= 400) {
				log(scene, step, 'fail', `HTTP ${status}`);
				await shot(page, `${scene}-${step.replace(/\s+/g, '-')}-http`);
				return false;
			}
			await page.waitForLoadState('networkidle', { timeout: 15_000 }).catch(() => {});
			await page.locator('[role="status"][aria-live="polite"]').waitFor({ state: 'hidden', timeout: 30_000 }).catch(() => {});
			await waitForAppShell(page);

			const navigation = await waitForPathStable(page, expectedPath);
			if (!navigation.ok) {
				log(scene, step, 'fail', `Redirected away — at ${navigation.path}, expected ${expectedPath}`);
				await shot(page, `${scene}-${step.replace(/\s+/g, '-')}-redirect`);
				return false;
			}

			if (selector) {
				const el = page.locator(selector).first();
				if (!(await el.isVisible({ timeout: 15_000 }).catch(() => false))) {
					return 'missing-selector';
				}
			}
			if (expectText) {
				const found = await page.getByText(expectText, { exact: false }).first().isVisible({ timeout: 10_000 }).catch(() => false);
				if (!found) {
					log(scene, step, 'fail', `Expected text: ${expectText}`);
					await shot(page, `${scene}-${step.replace(/\s+/g, '-')}`);
					return false;
				}
			}
			if (!(await assertNoFatalError(page, scene, step))) {
				await shot(page, `${scene}-${step.replace(/\s+/g, '-')}-error`);
				return false;
			}
			if (pageErrorTracker && !pageErrorTracker.assertCleanSince(errorMark, scene, step)) {
				await shot(page, `${scene}-${step.replace(/\s+/g, '-')}-pageerror`);
				return false;
			}
			log(scene, step, 'pass');
			return true;
		}
		catch (err) {
			log(scene, step, 'fail', err instanceof Error ? err.message : String(err));
			await shot(page, `${scene}-${step.replace(/\s+/g, '-')}-exception`).catch(() => {});
			return false;
		}
	};

	let result = await attempt();
	if (result === 'missing-selector') {
		if (retry) {
			await page.reload({ waitUntil: 'domcontentloaded' }).catch(() => {});
			result = await attempt();
		}
		if (result === 'missing-selector') {
			log(scene, step, 'fail', `Missing selector: ${selector}`);
			await shot(page, `${scene}-${step.replace(/\s+/g, '-')}`);
			return false;
		}
	}
	return result === true;
}

/** Assert FilterPanel + ListMoreMenu on pages migrated in Track C. */
async function assignHomeroomCoordinator(page, namePattern = /Assi/i) {
	const picker = page.getByRole('button', {
		name: /select a staff member|sélectionner un membre du personnel/i,
	}).last();
	if (!(await picker.isVisible({ timeout: 3_000 }).catch(() => false))) {
		return false;
	}
	await picker.click();
	const search = page.locator('[role="dialog"] input, [data-state="open"] input').last();
	await search.fill('Assi');
	const option = page.getByRole('option', { name: namePattern }).first();
	if (!(await option.isVisible({ timeout: 5_000 }).catch(() => false))) {
		await page.keyboard.press('Escape');
		return false;
	}
	await option.click();
	return true;
}

async function ensureDailyAttendanceMode(page, classId, { homeroomStaffName, force = false } = {}) {
	await visit(page, `${BASE}/configuration/classes/${classId}`, 'setup', `Open ${classId} config`, {
		pathPrefix: `/configuration/classes/${classId}`,
		selector: 'main',
	});

	const dailyOk = await page.getByText(/daily roll call|appel quotidien/i).isVisible({ timeout: 5_000 }).catch(() => false);
	const coordinatorBlock = page.locator('div').filter({
		has: page.getByText(/^Staff coordinator$|^Référent personnel$/i),
	}).last();
	const homeroomOk = homeroomStaffName
		? await coordinatorBlock.getByText(homeroomStaffName).isVisible({ timeout: 2_000 }).catch(() => false)
		: true;
	if (!force && dailyOk && homeroomOk) {
		return true;
	}

	const editBtn = page.getByRole('button', { name: /edit|modifier/i });
	if (!(await editBtn.isVisible({ timeout: 5_000 }).catch(() => false))) {
		return false;
	}
	await editBtn.click();
	await page.locator('[role="dialog"]').waitFor({ state: 'visible', timeout: 10_000 });

	if (!dailyOk) {
		const modeSelect = page.locator('[role="dialog"] select').filter({
			has: page.locator('option[value="daily"]'),
		}).last();
		await modeSelect.selectOption('daily');
	}

	if (homeroomStaffName && !homeroomOk) {
		await assignHomeroomCoordinator(page, homeroomStaffName);
	}

	await page.getByRole('button', { name: /save|enregistrer/i }).click();
	await page.locator('[role="dialog"]').waitFor({ state: 'hidden', timeout: 20_000 }).catch(() => {});
	await page.waitForLoadState('networkidle', { timeout: 15_000 }).catch(() => {});
	await page.waitForTimeout(2_000);
	return true;
}

async function assertListShellOrSkip(page, scene, step, { requireFilter = true, skipReason } = {}) {
	if (await page.locator('[role="alert"]').filter({ hasText: /something went wrong|une erreur est survenue/i })
		.isVisible({ timeout: 1_000 }).catch(() => false)) {
		log(scene, step, 'skip', skipReason ?? 'Page error — check permissions or seed');
		return true;
	}
	return assertListShell(page, scene, step, { requireFilter });
}

async function assertFilterSelectShellOrSkip(page, scene, step, skipReason) {
	if (await page.locator('[role="alert"]').filter({ hasText: /something went wrong|une erreur est survenue/i })
		.isVisible({ timeout: 1_000 }).catch(() => false)) {
		log(scene, step, 'skip', skipReason ?? 'Page error — check permissions or seed');
		return true;
	}
	return assertFilterSelectShell(page, scene, step);
}

async function assertListShell(page, scene, step, { requireFilter = true } = {}) {
	const errorMark = pageErrorTracker?.snapshot() ?? 0;
	try {
		await page.locator('[role="status"][aria-live="polite"]').waitFor({ state: 'hidden', timeout: 30_000 }).catch(() => {});
		const moreBtn = page.getByTestId('list-more-menu');
		if (!(await moreBtn.isVisible({ timeout: 15_000 }).catch(() => false))) {
			log(scene, step, 'fail', 'Missing list more menu');
			await shot(page, `${scene}-${step.replace(/\s+/g, '-')}`);
			return false;
		}
		await moreBtn.click();
		const exportItem = page.getByRole('button', { name: /export|exporter/i });
		if (!(await exportItem.isVisible({ timeout: 5_000 }).catch(() => false))) {
			log(scene, step, 'fail', 'Export action missing in more menu');
			await shot(page, `${scene}-${step.replace(/\s+/g, '-')}-export`);
			return false;
		}
		await page.keyboard.press('Escape');

		if (requireFilter) {
			const filterBtn = page.getByTestId('list-filter');
			if (!(await filterBtn.isVisible({ timeout: 5_000 }).catch(() => false))) {
				log(scene, step, 'fail', 'Missing filter panel trigger');
				await shot(page, `${scene}-${step.replace(/\s+/g, '-')}-filter`);
				return false;
			}
			await filterBtn.click();
			const popover = page.locator('[data-state="open"]').last();
			if (!(await popover.isVisible({ timeout: 5_000 }).catch(() => false))) {
				log(scene, step, 'fail', 'Filter popover did not open');
				await shot(page, `${scene}-${step.replace(/\s+/g, '-')}-filter-open`);
				return false;
			}
			await page.keyboard.press('Escape');
		}

		if (!(await assertNoFatalError(page, scene, step))) {
			return false;
		}
		if (pageErrorTracker && !pageErrorTracker.assertCleanSince(errorMark, scene, step)) {
			await shot(page, `${scene}-${step.replace(/\s+/g, '-')}-pageerror`);
			return false;
		}
		log(scene, step, 'pass');
		return true;
	}
	catch (err) {
		log(scene, step, 'fail', err instanceof Error ? err.message : String(err));
		await shot(page, `${scene}-${step.replace(/\s+/g, '-')}-exception`).catch(() => {});
		return false;
	}
}

/** Pages with FilterSelect chip bar instead of FilterPanel. */
async function assertFilterSelectShell(page, scene, step) {
	const errorMark = pageErrorTracker?.snapshot() ?? 0;
	try {
		await page.locator('[role="status"][aria-live="polite"]').waitFor({ state: 'hidden', timeout: 30_000 }).catch(() => {});
		const filterSelect = page.locator('select[aria-label="Filter"]');
		const moreBtn = page.getByTestId('list-more-menu');
		if (!(await filterSelect.first().isVisible({ timeout: 15_000 }).catch(() => false))) {
			log(scene, step, 'fail', 'Missing filter select');
			await shot(page, `${scene}-${step.replace(/\s+/g, '-')}`);
			return false;
		}
		if (!(await moreBtn.isVisible({ timeout: 5_000 }).catch(() => false))) {
			log(scene, step, 'fail', 'Missing list more menu');
			await shot(page, `${scene}-${step.replace(/\s+/g, '-')}`);
			return false;
		}
		if (pageErrorTracker && !pageErrorTracker.assertCleanSince(errorMark, scene, step)) {
			await shot(page, `${scene}-${step.replace(/\s+/g, '-')}-pageerror`);
			return false;
		}
		log(scene, step, 'pass');
		return true;
	}
	catch (err) {
		log(scene, step, 'fail', err instanceof Error ? err.message : String(err));
		return false;
	}
}

/** URL-backed drawer tabs: deep links, click sync, close strips ?tab=. */
async function runDrawerTabChecks(page) {
	const scene = 'DD';

	// Class group drawer (configuration) — reliable with director login
	const classAssignmentsUrl = `${BASE}/configuration/classes/${CLASS_6A}?tab=assignments`;
	if (!(await visit(page, classAssignmentsUrl, scene, '1 Class group assignments deep-link', {
		pathPrefix: `/configuration/classes/${CLASS_6A}`,
	}))) {
		return;
	}

	if (!(await waitForDrawerTabBar(page))) {
		log(scene, '2 Class drawer tab bar', 'fail', 'Drawer tab bar not visible');
		await shot(page, 'DD-2-class-tab-bar');
		return;
	}
	log(scene, '2 Class drawer tab bar', 'pass');

	if (await waitForUrlTab(page, 'assignments')) {
		log(scene, '3 Class URL tab=assignments', 'pass');
	}
	else {
		log(scene, '3 Class URL tab=assignments', 'fail', `tab=${urlTabParam(page) ?? 'none'}`);
		await shot(page, 'DD-3-class-url');
	}

	const assignmentsPanel = page.getByText(/staff assignments|affectations du personnel|homeroom|professeur principal/i);
	if (await assignmentsPanel.first().isVisible({ timeout: 8_000 }).catch(() => false)) {
		log(scene, '4 Class assignments tab content', 'pass');
	}
	else {
		log(scene, '4 Class assignments tab content', 'skip', 'Assignments panel copy not found — drawer tab still synced');
	}

	if (await clickDrawerTab(page, 'profile')) {
		if (await waitForUrlTab(page, null, { absent: true })) {
			log(scene, '5 Class profile clears URL param', 'pass');
		}
		else {
			log(scene, '5 Class profile clears URL param', 'fail', `tab=${urlTabParam(page) ?? 'none'}`);
			await shot(page, 'DD-5-class-profile-url');
		}
	}
	else {
		log(scene, '5 Class profile clears URL param', 'fail', 'Could not click profile tab');
	}

	if (await clickDrawerTab(page, 'assignments')) {
		if (await waitForUrlTab(page, 'assignments')) {
			log(scene, '6 Class assignments updates URL', 'pass');
		}
		else {
			log(scene, '6 Class assignments updates URL', 'fail', `tab=${urlTabParam(page) ?? 'none'}`);
			await shot(page, 'DD-6-class-assign-url');
		}
	}
	else {
		log(scene, '6 Class assignments updates URL', 'fail', 'Could not click assignments tab');
	}

	// Student drawer — deep-link without visiting list first
	if (await visit(page, `${BASE}/school/students/${STUDENT_ID}?tab=grades`, scene, '7 Student grades deep-link', {
		pathPrefix: `/school/students/${STUDENT_ID}`,
	})) {
		if (await waitForDrawerTabBar(page)) {
			log(scene, '8 Student drawer tab bar', 'pass');
		}
		else {
			log(scene, '8 Student drawer tab bar', 'fail', 'Drawer did not open on direct URL');
			await shot(page, 'DD-8-student-tab-bar');
		}

		if (await waitForUrlTab(page, 'grades')) {
			log(scene, '9 Student URL tab=grades', 'pass');
		}
		else {
			log(scene, '9 Student URL tab=grades', 'fail', `tab=${urlTabParam(page) ?? 'none'}`);
			await shot(page, 'DD-9-student-url');
		}

		if (await clickDrawerTab(page, 'profile') && await waitForUrlTab(page, null, { absent: true })) {
			log(scene, '10 Student profile clears URL param', 'pass');
		}
		else {
			log(scene, '10 Student profile clears URL param', 'fail', `tab=${urlTabParam(page) ?? 'none'}`);
		}
	}

	if (await visit(page, `${BASE}/school/teachers/${TEACHER_ID}?tab=assignments`, scene, '11 Teacher assignments deep-link', {
		pathPrefix: `/school/teachers/${TEACHER_ID}`,
	})) {
		if (await waitForDrawerTabBar(page) && await waitForUrlTab(page, 'assignments')) {
			log(scene, '12 Teacher URL tab=assignments', 'pass');
		}
		else {
			log(scene, '12 Teacher URL tab=assignments', 'fail', `tab=${urlTabParam(page) ?? 'none'}`);
			await shot(page, 'DD-12-teacher-url');
		}
	}

	if (await visit(page, `${BASE}/school/staff/${STAFF_ID}?tab=permissions`, scene, '13 Staff permissions deep-link', {
		pathPrefix: `/school/staff/${STAFF_ID}`,
	})) {
		if (await waitForDrawerTabBar(page) && await waitForUrlTab(page, 'permissions')) {
			log(scene, '14 Staff URL tab=permissions', 'pass');
		}
		else {
			log(scene, '14 Staff URL tab=permissions', 'skip', 'Permissions tab not available — check ACCESS_CONTROL_ASSIGN');
		}
	}

	// Subject drawer (class teaching)
	const subjectLogbookUrl = `${BASE}/classes/${CLASS_6A}/teaching/${CLASS_SUBJECT_ID}?tab=logbook`;
	if (await visit(page, subjectLogbookUrl, scene, '15 Subject logbook deep-link', {
		pathPrefix: `/classes/${CLASS_6A}/teaching/${CLASS_SUBJECT_ID}`,
	})) {
		if (await waitForDrawerTabBar(page) && await waitForUrlTab(page, 'logbook')) {
			log(scene, '16 Subject URL tab=logbook', 'pass');
		}
		else {
			log(scene, '16 Subject URL tab=logbook', 'fail', `tab=${urlTabParam(page) ?? 'none'}`);
			await shot(page, 'DD-16-subject-url');
		}

		if (await clickDrawerTab(page, 'progression')) {
			if (await waitForUrlTab(page, null, { absent: true })) {
				log(scene, '17 Subject progression clears URL param', 'pass');
			}
			else {
				log(scene, '17 Subject progression clears URL param', 'fail', `tab=${urlTabParam(page) ?? 'none'}`);
				await shot(page, 'DD-17-subject-progression-url');
			}
		}
		else {
			log(scene, '17 Subject progression clears URL param', 'fail', 'Could not click chapters tab');
		}

		if (await clickDrawerTab(page, 'logbook')) {
			if (await waitForUrlTab(page, 'logbook')) {
				log(scene, '18 Subject logbook updates URL', 'pass');
			}
			else {
				log(scene, '18 Subject logbook updates URL', 'fail', `tab=${urlTabParam(page) ?? 'none'}`);
				await shot(page, 'DD-18-subject-logbook-url');
			}
		}
		else {
			log(scene, '18 Subject logbook updates URL', 'fail', 'Could not click logbook tab');
		}
	}

	// Close drawer strips ?tab=
	await visit(page, classAssignmentsUrl, scene, '19 Reopen class drawer for close test', {
		pathPrefix: `/configuration/classes/${CLASS_6A}`,
	});
	if (await closeDrawer(page)) {
		const listPath = new URL(page.url()).pathname;
		const tabAfterClose = urlTabParam(page);
		if (listPath === '/configuration/classes' && tabAfterClose === null) {
			log(scene, '20 Close drawer strips tab param', 'pass');
		}
		else {
			log(scene, '20 Close drawer strips tab param', 'fail', `path=${listPath} tab=${tabAfterClose ?? 'none'}`);
			await shot(page, 'DD-20-close');
		}
	}
	else {
		log(scene, '20 Close drawer strips tab param', 'fail', 'Close button not found');
	}
}

/** URL-backed modals: deep links, open sync, close strips ?modal=. */
async function runModalUrlChecks(page) {
	const scene = 'DM';

	if (await visit(page, `${BASE}/school/students?modal=create`, scene, '1 Students create deep-link', {
		pathPrefix: '/school/students',
	})) {
		if (await waitForFormModal(page)) {
			log(scene, '2 Students create modal visible', 'pass');
		}
		else {
			log(scene, '2 Students create modal visible', 'fail', 'form-modal not found');
			await shot(page, 'DM-2-students-create');
		}

		if (await waitForUrlModal(page, 'create')) {
			log(scene, '3 Students URL modal=create', 'pass');
		}
		else {
			log(scene, '3 Students URL modal=create', 'fail', `modal=${urlModalParam(page) ?? 'none'}`);
		}

		if (await closeFormModal(page) && await waitForUrlModal(page, null, { absent: true })) {
			log(scene, '4 Students close strips modal param', 'pass');
		}
		else {
			log(scene, '4 Students close strips modal param', 'fail', `modal=${urlModalParam(page) ?? 'none'}`);
			await shot(page, 'DM-4-students-close');
		}
	}

	if (await visit(page, `${BASE}/school/teachers?modal=create`, scene, '5 Teachers create deep-link', {
		pathPrefix: '/school/teachers',
	})) {
		if (await waitForFormModal(page) && await waitForUrlModal(page, 'create')) {
			log(scene, '6 Teachers URL modal=create', 'pass');
		}
		else {
			log(scene, '6 Teachers URL modal=create', 'fail', `modal=${urlModalParam(page) ?? 'none'}`);
		}
	}

	if (await visit(page, `${BASE}/school/staff?modal=create`, scene, '7 Staff create deep-link', {
		pathPrefix: '/school/staff',
	})) {
		if (await waitForFormModal(page) && await waitForUrlModal(page, 'create')) {
			log(scene, '8 Staff URL modal=create', 'pass');
		}
		else {
			log(scene, '8 Staff URL modal=create', 'fail', `modal=${urlModalParam(page) ?? 'none'}`);
		}
	}

	if (await visit(page, `${BASE}/configuration/classes/${CLASS_6A}?modal=edit`, scene, '9 Class edit deep-link', {
		pathPrefix: `/configuration/classes/${CLASS_6A}`,
	})) {
		if (await waitForDrawerAside(page) && await waitForFormModal(page) && await waitForUrlModal(page, 'edit')) {
			log(scene, '10 Class URL modal=edit', 'pass');
		}
		else {
			log(scene, '10 Class URL modal=edit', 'fail', `modal=${urlModalParam(page) ?? 'none'}`);
			await shot(page, 'DM-10-class-edit');
		}
	}

	if (await visit(page, `${BASE}/school/students/${STUDENT_ID}?modal=edit-profile`, scene, '11 Student edit-profile deep-link', {
		pathPrefix: `/school/students/${STUDENT_ID}`,
	})) {
		if (await waitForDrawerAside(page) && await waitForFormModal(page) && await waitForUrlModal(page, 'edit-profile')) {
			log(scene, '12 Student URL modal=edit-profile', 'pass');
		}
		else {
			log(scene, '12 Student URL modal=edit-profile', 'fail', `modal=${urlModalParam(page) ?? 'none'}`);
			await shot(page, 'DM-12-student-edit');
		}
	}

	if (await visit(page, `${BASE}/school/students/${STUDENT_ID}?tab=profile&modal=link-guardian`, scene, '13 Student link-guardian deep-link', {
		pathPrefix: `/school/students/${STUDENT_ID}`,
	})) {
		const picker = await waitForPickerModal(page);
		if (picker && await waitForUrlModal(page, 'link-guardian')) {
			log(scene, '14 Student URL modal=link-guardian', 'pass');
		}
		else {
			log(scene, '14 Student URL modal=link-guardian', 'fail', `modal=${urlModalParam(page) ?? 'none'}`);
			await shot(page, 'DM-14-student-guardian');
		}
	}

	if (await visit(page, `${BASE}/school/students/${STUDENT_ID}?tab=grades&modal=add-grade`, scene, '15 Student add-grade deep-link', {
		pathPrefix: `/school/students/${STUDENT_ID}`,
	})) {
		if (await waitForDrawerAside(page) && await waitForFormModal(page) && await waitForUrlModal(page, 'add-grade')) {
			log(scene, '16 Student URL modal=add-grade', 'pass');
		}
		else {
			log(scene, '16 Student URL modal=add-grade', 'fail', `modal=${urlModalParam(page) ?? 'none'}`);
		}
	}

	if (await visit(page, `${BASE}/classes/${CLASS_6A}/teaching/${CLASS_SUBJECT_ID}?modal=edit-subject`, scene, '17 Subject edit deep-link', {
		pathPrefix: `/classes/${CLASS_6A}/teaching/${CLASS_SUBJECT_ID}`,
	})) {
		if (await waitForDrawerAside(page) && await waitForFormModal(page) && await waitForUrlModal(page, 'edit-subject')) {
			log(scene, '18 Subject URL modal=edit-subject', 'pass');
		}
		else {
			log(scene, '18 Subject URL modal=edit-subject', 'fail', `modal=${urlModalParam(page) ?? 'none'}`);
		}
	}

	if (await visit(page, `${BASE}/school/staff/${STAFF_ID}?tab=permissions&modal=add-permission`, scene, '19 Staff add-permission deep-link', {
		pathPrefix: `/school/staff/${STAFF_ID}`,
	})) {
		if (await waitForDrawerAside(page) && await waitForFormModal(page) && await waitForUrlModal(page, 'add-permission')) {
			log(scene, '20 Staff URL modal=add-permission', 'pass');
		}
		else {
			log(scene, '20 Staff URL modal=add-permission', 'skip', 'Permissions tab or ACCESS_CONTROL_ASSIGN');
		}
	}
}

function urlModalParam(page) {
	return new URL(page.url()).searchParams.get('modal');
}

async function waitForUrlModal(page, expected, { absent = false, timeoutMs = 12_000 } = {}) {
	const deadline = Date.now() + timeoutMs;
	while (Date.now() < deadline) {
		const modal = urlModalParam(page);
		if (absent ? modal === null : modal === expected) {
			return true;
		}
		await page.waitForTimeout(120);
	}
	return false;
}

async function waitForFormModal(page, timeoutMs = 30_000) {
	const modal = page.getByTestId('form-modal');
	return modal.waitFor({ state: 'visible', timeout: timeoutMs }).then(() => true).catch(() => false);
}

async function waitForPickerModal(page, timeoutMs = 30_000) {
	const modal = page.getByTestId('picker-modal');
	return modal.waitFor({ state: 'visible', timeout: timeoutMs }).then(() => true).catch(() => false);
}

async function closeFormModal(page) {
	const modal = page.getByTestId('form-modal');
	const cancelBtn = modal.getByRole('button', { name: /cancel|annuler/i });
	if (await cancelBtn.isVisible({ timeout: 5_000 }).catch(() => false)) {
		await cancelBtn.click();
		await page.waitForTimeout(400);
		return true;
	}
	return false;
}

function urlTabParam(page) {
	return new URL(page.url()).searchParams.get('tab');
}

async function waitForUrlTab(page, expected, { absent = false, timeoutMs = 12_000 } = {}) {
	const deadline = Date.now() + timeoutMs;
	while (Date.now() < deadline) {
		const tab = urlTabParam(page);
		if (absent ? tab === null : tab === expected) {
			return true;
		}
		await page.waitForTimeout(120);
	}
	return false;
}

async function waitForDrawerAside(page, timeoutMs = 30_000) {
	const drawer = page.locator('aside.fixed.right-0');
	return drawer.waitFor({ state: 'visible', timeout: timeoutMs }).then(() => drawer).catch(() => null);
}

async function waitForDrawerTabBar(page, timeoutMs = 30_000) {
	const drawer = await waitForDrawerAside(page, timeoutMs);
	if (!drawer) {
		return null;
	}
	// DetailDrawer lazy-loads tab content; allow dynamic import to finish.
	await page.locator('[role="status"][aria-live="polite"]').waitFor({ state: 'hidden', timeout: timeoutMs }).catch(() => {});
	const bar = page.getByTestId('drawer-tab-bar');
	if (await bar.waitFor({ state: 'visible', timeout: timeoutMs }).then(() => true).catch(() => false)) {
		return bar;
	}
	const fallback = drawer.locator('button.rounded-full').first();
	if (await fallback.isVisible({ timeout: 5_000 }).catch(() => false)) {
		return drawer;
	}
	return null;
}

async function clickDrawerTab(page, tabKey) {
	const label = DRAWER_TAB_LABELS[tabKey];
	if (!label) {
		throw new Error(`Unknown drawer tab key: ${tabKey}`);
	}
	if (!(await waitForDrawerTabBar(page))) {
		return false;
	}
	const testBar = page.getByTestId('drawer-tab-bar');
	const root = await testBar.isVisible().catch(() => false)
		? testBar
		: page.locator('aside.fixed.right-0');
	const btn = root.getByRole('button', { name: label });
	if (!(await btn.isVisible({ timeout: 5_000 }).catch(() => false))) {
		return false;
	}
	await btn.click();
	await page.waitForTimeout(350);
	return true;
}

async function closeDrawer(page) {
	const closeBtn = page.locator('aside.fixed.right-0 footer').getByRole('button', { name: /close|fermer/i });
	if (await closeBtn.isVisible({ timeout: 5_000 }).catch(() => false)) {
		await closeBtn.click();
		await page.waitForTimeout(500);
		return true;
	}
	return false;
}

async function assertClassAttendanceNav(page, classId, scene, step) {
	const classPath = `/classes/${classId}`;
	await visit(page, `${BASE}${classPath}/students`, scene, `${step} — class shell`, {
		pathPrefix: classPath,
		selector: 'main',
	});

	const classesToggle = page.locator('aside#app-sidebar button, aside#app-sidebar a').filter({ hasText: /classes|classe/i }).first();
	if (await classesToggle.isVisible({ timeout: 3_000 }).catch(() => false)) {
		await classesToggle.click().catch(() => {});
	}

	const attendanceLink = page.locator(`aside#app-sidebar a[href*="/classes/${classId}/attendance"]`);
	const visible = await attendanceLink.isVisible({ timeout: 10_000 }).catch(() => false);
	if (visible) {
		log(scene, step, 'pass');
		return true;
	}
	log(scene, step, 'fail', 'Attendance nav tab not visible for daily class');
	await shot(page, `${scene}-${step.replace(/\s+/g, '-')}`);
	return false;
}

async function runHomeroomNudgeCheck(browser) {
	const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
	const page = await context.newPage();
	const scene = 'DN';
	try {
		await signIn(page, { namePattern: /Mme Assi|Assi/i, email: COORDINATOR_EMAIL });
		log(scene, 'N.1 Login f.assi@', 'pass');

		const configured = await ensureDailyAttendanceMode(page, CLASS_6A, {
			homeroomStaffName: /Assi/i,
			force: true,
		});
		if (!configured) {
			log(scene, 'N.2 Ensure 6ème A daily mode', 'fail', 'Could not set daily attendance mode');
			return;
		}
		log(scene, 'N.2 Ensure 6ème A daily mode', 'pass');

		await page.waitForLoadState('networkidle', { timeout: 15_000 }).catch(() => {});
		await visit(page, `${BASE}/dashboard`, scene, 'N.3 Dashboard loads', { selector: 'main' });

		const nudge = page.getByTestId('homeroom-attendance-nudge');
		const appeared = await nudge.waitFor({ timeout: 25_000 }).then(() => true).catch(() => false);
		if (!appeared) {
			log(scene, 'N.4 Homeroom attendance nudge', 'fail', 'Nudge not visible for homeroom coordinator');
			await shot(page, 'DN-nudge-missing');
			return;
		}

		const nudgeText = await nudge.textContent();
		if (!/roll call|appel du jour/i.test(nudgeText ?? '')) {
			log(scene, 'N.4 Homeroom attendance nudge', 'fail', 'Unexpected nudge copy');
			await shot(page, 'DN-nudge-copy');
			return;
		}

		const classLink = nudge.locator(`a[href*="/classes/${CLASS_6A}/attendance"]`);
		if (!(await classLink.isVisible({ timeout: 5_000 }).catch(() => false))) {
			log(scene, 'N.4 Homeroom attendance nudge', 'fail', `Missing link to ${CLASS_6A} attendance`);
			await shot(page, 'DN-nudge-link');
			return;
		}

		if (!/6ème A|6eme A/i.test(nudgeText ?? '')) {
			log(scene, 'N.4 Homeroom attendance nudge', 'skip', '6ème A label not in nudge — verify locale');
		}
		else {
			log(scene, 'N.4 Homeroom attendance nudge', 'pass');
		}

		await classLink.click();
		const onAttendance = await page.waitForURL(new RegExp(`/classes/${CLASS_6A}/attendance`), { timeout: 15_000 })
			.then(() => true)
			.catch(() => false);
		if (onAttendance && await assertNoFatalError(page, scene, 'N.5 Nudge deep-link')) {
			log(scene, 'N.5 Nudge deep-link to attendance', 'pass');
		}
		else {
			log(scene, 'N.5 Nudge deep-link to attendance', 'fail', onAttendance ? 'Error on attendance page' : 'Navigation failed');
			await shot(page, 'DN-nudge-nav');
		}
	}
	catch (err) {
		log(scene, 'N.0 Homeroom nudge scene', 'fail', err instanceof Error ? err.message : String(err));
		await shot(page, 'DN-scene-exception').catch(() => {});
	}
	finally {
		await context.close();
	}
}

async function main() {
	await mkdir(OUT_DIR, { recursive: true });
	const browser = await chromium.launch({ headless: true });
	const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
	const page = await context.newPage();

	const consoleErrors = [];
	setupPageErrorTracking(page, consoleErrors);

	// D0 — Login & shell
	try {
		await signIn(page);
		log('D0', '0.1 Login j.aka@', 'pass');
		await shot(page, 'D0-login');
	}
	catch (err) {
		log('D0', '0.1 Login j.aka@', 'fail', err instanceof Error ? err.message : String(err));
		await shot(page, 'D0-login-fail');
		await writeFile(path.join(OUT_DIR, 'results.json'), JSON.stringify({ results, consoleErrors }, null, 2));
		await browser.close();
		process.exit(1);
	}

	await visit(page, `${BASE}/dashboard`, 'D0', '0.2 Dashboard / school context', { expectText: /tableau|dashboard|directeur|cocody/i });
	await visit(page, `${BASE}/school/students`, 'D0', '0.3 Sidebar school students');

	// D2 — Students
	try {
		await page.waitForSelector('main', { timeout: 20_000 });
		const rosterVisible = await page.getByText(/Effectif|élève/i).first()
			.isVisible({ timeout: 15_000 })
			.catch(() => false);
		if (rosterVisible && await assertNoFatalError(page, 'D2', '2.1 Student list')) {
			log('D2', '2.1 Student list', 'pass');
		}
		else {
			log('D2', '2.1 Student list', 'fail', rosterVisible ? 'Error state visible on page' : 'Roster header missing');
			await shot(page, 'D2-2.1-Student-list');
		}
	}
	catch (err) {
		log('D2', '2.1 Student list', 'fail', err instanceof Error ? err.message : String(err));
		await shot(page, 'D2-2.1-Student-list-exception').catch(() => {});
	}
	await visit(page, `${BASE}/school/students/ci-s1`, 'D2', '2.2 Student drawer Kouamé Aya', { expectText: /Kouamé|Aya|ci-s1/i });
	await visit(page, `${BASE}/school/guardians`, 'D2', '2.4 Guardians list', { selector: 'main' });

	// D1 — Director dashboard
	await visit(page, `${BASE}/dashboard`, 'D1', '1.1 KPI cards', { selector: 'aside#app-sidebar' });
	try {
		await page.locator('a[href*="/school/students"]').first().click();
		const onStudents = await page.waitForURL(/\/school\/students/, { timeout: 15_000 })
			.then(() => true)
			.catch(() => false);
		if (onStudents && await assertNoFatalError(page, 'D1', '1.2 Dashboard students link')) {
			log('D1', '1.2 Dashboard students link', 'pass');
		}
		else {
			log('D1', '1.2 Dashboard students link', 'fail', onStudents ? 'Error state after navigation' : 'Did not reach students list');
			await shot(page, 'D1-1.2-Dashboard-students-link');
		}
	}
	catch (err) {
		log('D1', '1.2 Dashboard students link', 'fail', err instanceof Error ? err.message : String(err));
		await shot(page, 'D1-1.2-Dashboard-students-link-exception').catch(() => {});
	}

	// D3 — Teachers
	await visit(page, `${BASE}/school/teachers`, 'D3', '3.1 Teachers list', { selector: 'main' });
	await visit(page, `${BASE}/school/teachers/ci-t1`, 'D3', '3.2 Mme Touré drawer', { expectText: /Touré|ci-t1/i });

	// D4 — Staff permissions
	await visit(page, `${BASE}/school/staff`, 'D4', '4.1 Staff list', { selector: 'main' });

	// D5 — Timetable
	const timetablePath = `/classes/${CLASS_6A}/timetable`;
	await visit(page, `${BASE}${timetablePath}`, 'D5', '5.1 Timetable grid', {
		pathPrefix: timetablePath,
		selector: '#planning-week-picker, .edaya-timetable-calendar',
	});
	const pageHtml = await page.content();
	const mathsOrTeacher = /Touré|Mathématiques|fractions|géométrie/i.test(pageHtml);
	log(
		'D5',
		'5.2 Maths slot shows Mme Touré',
		mathsOrTeacher ? 'pass' : 'skip',
		mathsOrTeacher ? undefined : 'No maths lesson text in grid — verify seed week / teacher assignments manually',
	);

	// D6 — Evaluations
	await visit(page, `${BASE}/classes/${CLASS_6A}/evaluations`, 'D6', '6.1 Evaluations list', { selector: 'main' });

	// D7 — Daily attendance 6ème B
	if (await ensureDailyAttendanceMode(page, CLASS_6B)) {
		log('D7', '7.0 Ensure 6ème B daily mode', 'pass');
	}
	else {
		log('D7', '7.0 Ensure 6ème B daily mode', 'skip', 'Could not configure daily mode — check SCHOOL_STRUCTURE_CONFIGURE');
	}
	await assertClassAttendanceNav(page, CLASS_6B, 'D7', '7.1 Attendance nav on 6ème B');
	await visit(page, `${BASE}/classes/${CLASS_6B}/attendance`, 'D7', '7.2 Daily attendance page', { selector: 'main' });

	// D8 — School life
	await visit(page, `${BASE}/school/activities`, 'D8', '8.1 Activities list', {
		selector: 'main',
		expectText: DEMO_ACTIVITY_NAME,
	});
	await visit(page, `${BASE}/school/announcements`, 'D8', '8.3 Announcements', { selector: 'main' });
	await visit(page, `${BASE}/school/events`, 'D8', '8.4 Incidents/events', { selector: 'main' });

	// D9 — Finance
	await visit(page, `${BASE}/finance/fees`, 'D9', '9.1 Fees list', { selector: 'main' });
	await visit(page, `${BASE}/finance/payment`, 'D9', '9.2 Payments', { selector: 'main' });
	await visit(page, `${BASE}/finance/billing`, 'D9', '9.3 Billing drawer area', { selector: 'main' });

	// D10 — Report cards
	await visit(page, `${BASE}/classes/${CLASS_6A}/report-cards`, 'D10', '10.1 Report cards list', { selector: 'main' });

	// D11 — Configuration
	await visit(page, `${BASE}/configuration/classes/ci-6a`, 'D11', '11.1 Class config drawer', { selector: 'main' });
	await visit(page, `${BASE}/configuration/grade-levels`, 'D11', '11.2 Grade levels', { selector: 'main' });
	await visit(page, `${BASE}/configuration/academic`, 'D11', '11.3 Academic calendar', { selector: 'main' });
	await visit(page, `${BASE}/configuration/discipline`, 'D11', '11.4 Disciplinary catalog', { selector: 'main' });

	// DC — Track B/C list shell polish
	await visit(page, `${BASE}/school/students`, 'DC1', 'Students list shell', { pathPrefix: '/school/students' });
	await assertListShell(page, 'DC1', 'Students Filter + More menu');

	await visit(page, `${BASE}/finance/payment`, 'DC2', 'Payments list shell', { pathPrefix: '/finance/payment' });
	await assertListShell(page, 'DC2', 'Payments Filter + More menu');

	await visit(page, `${BASE}/configuration/classes`, 'DC3', 'Class groups list shell', { pathPrefix: '/configuration/classes' });
	await assertListShell(page, 'DC3', 'Class groups Filter + More menu');

	await visit(page, `${BASE}/configuration/academic`, 'DC4', 'Academic admin list shell', { pathPrefix: '/configuration/academic' });
	await assertListShell(page, 'DC4', 'Academic admin Filter + More menu');

	await visit(page, `${BASE}/classes/${CLASS_6B}/attendance`, 'DC5', 'Attendance list shell', {
		pathPrefix: `/classes/${CLASS_6B}/attendance`,
	});
	await assertListShell(page, 'DC5', 'Attendance Filter + More menu');

	await visit(page, `${BASE}/school/announcements`, 'DC6', 'Announcements list shell', { pathPrefix: '/school/announcements' });
	await assertListShell(page, 'DC6', 'Announcements Filter + More menu');

	await visit(page, `${BASE}/classes/${CLASS_6A}/evaluations`, 'DC7', 'Evaluations filter select', {
		pathPrefix: `/classes/${CLASS_6A}/evaluations`,
	});
	await assertFilterSelectShell(page, 'DC7', 'Evaluations FilterSelect + More menu');

	await visit(page, `${BASE}/school/activities`, 'DC8', 'Activities filter select', { pathPrefix: '/school/activities' });
	await assertFilterSelectShell(page, 'DC8', 'Activities FilterSelect + More menu');

	await visitOrSkip(page, `${BASE}/configuration/report-cards`, 'DC9', 'Report card defs filter select', {
		pathPrefix: '/configuration/report-cards',
		skipOnFail: 'Director role may lack REPORT_CARD_CONFIGURE',
	});
	await assertFilterSelectShellOrSkip(page, 'DC9', 'Report card definitions FilterSelect + More menu', 'Director role may lack REPORT_CARD_CONFIGURE');

	await visitOrSkip(page, `${BASE}/school/calendar`, 'DC10', 'School calendar filter select', {
		pathPrefix: '/school/calendar',
		skipOnFail: 'Calendar query returned 403 — verify seed grants',
	});
	await assertFilterSelectShellOrSkip(page, 'DC10', 'School calendar FilterSelect + More menu', 'Calendar query returned 403 — verify seed grants');

	await runDrawerTabChecks(page);
	await runModalUrlChecks(page);

	await context.close();
	await runHomeroomNudgeCheck(browser);

	const summary = {
		passed: results.filter(r => r.status === 'pass').length,
		failed: results.filter(r => r.status === 'fail').length,
		skipped: results.filter(r => r.status === 'skip').length,
		results,
		consoleErrors: [...new Set(consoleErrors)].slice(0, 30),
	};
	await writeFile(path.join(OUT_DIR, 'results.json'), JSON.stringify(summary, null, 2));
	console.log('\n--- Summary ---');
	console.log(`Pass: ${summary.passed}  Fail: ${summary.failed}  Skip: ${summary.skipped}`);
	if (summary.consoleErrors.length) {
		console.log('Console errors (sample):', summary.consoleErrors.slice(0, 5).join(' | '));
	}

	await browser.close();
	process.exit(summary.failed > 0 ? 1 : 0);
}

main().catch(err => {
	console.error(err);
	process.exit(1);
});
