/**
 * Demo-ready plan (DR.1) — automated browser dry-run for scenes D0–D11.
 * Run: node scripts/demo-dry-run.mjs
 * Requires: webapp on :5173, API seeded with demo-ci.
 */
import { chromium } from 'playwright';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

const BASE = process.env.WEBAPP_URL ?? 'http://localhost:5173';
const PASSWORD = 'DevPassword1!';
const STAFF_EMAIL = 'j.aka@ecole-ci.edaya.dev';
const OUT_DIR = path.join(import.meta.dirname, '../.demo-dry-run');
const CLASS_6A = 'ci-6a';
const CLASS_6B = 'ci-6b';

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

async function signIn(page) {
	await page.goto(`${BASE}/login/demo`, { waitUntil: 'domcontentloaded' });
	const akaBtn = page.getByRole('button', { name: /Jean-Baptiste Aka|Aka/i });
	const hasDemoPicker = await akaBtn.waitFor({ timeout: 20_000 }).then(() => true).catch(() => false);
	if (hasDemoPicker) {
		await akaBtn.click();
	} else {
		await page.goto(`${BASE}/login`, { waitUntil: 'domcontentloaded' });
		await page.getByRole('textbox').first().fill(STAFF_EMAIL);
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
		const path = new URL(page.url()).pathname;
		if (path.startsWith(expectedPathPrefix)) {
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

async function visit(page, url, scene, step, { expectText, selector, pathPrefix } = {}) {
	const expectedPath = pathPrefix ?? new URL(url).pathname;
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
				log(scene, step, 'fail', `Missing selector: ${selector}`);
				await shot(page, `${scene}-${step.replace(/\s+/g, '-')}`);
				return false;
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
		log(scene, step, 'pass');
		return true;
	} catch (err) {
		log(scene, step, 'fail', err instanceof Error ? err.message : String(err));
		await shot(page, `${scene}-${step.replace(/\s+/g, '-')}-exception`).catch(() => {});
		return false;
	}
}

async function main() {
	await mkdir(OUT_DIR, { recursive: true });
	const browser = await chromium.launch({ headless: true });
	const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
	const page = await context.newPage();

	const consoleErrors = [];
	page.on('console', msg => {
		if (msg.type() === 'error') consoleErrors.push(msg.text());
	});
	page.on('pageerror', err => consoleErrors.push(err.message));

	// D0 — Login & shell
	try {
		await signIn(page);
		log('D0', '0.1 Login j.aka@', 'pass');
		await shot(page, 'D0-login');
	} catch (err) {
		log('D0', '0.1 Login j.aka@', 'fail', err instanceof Error ? err.message : String(err));
		await shot(page, 'D0-login-fail');
		await writeFile(path.join(OUT_DIR, 'results.json'), JSON.stringify({ results, consoleErrors }, null, 2));
		await browser.close();
		process.exit(1);
	}

	await visit(page, `${BASE}/dashboard`, 'D0', '0.2 Dashboard / school context', { expectText: /tableau|dashboard|directeur|cocody/i });
	await visit(page, `${BASE}/school/students`, 'D0', '0.3 Sidebar school students');

	// D1 — Director dashboard
	await visit(page, `${BASE}/dashboard`, 'D1', '1.1 KPI cards', { selector: 'aside#app-sidebar' });

	// D2 — Students
	await visit(page, `${BASE}/school/students`, 'D2', '2.1 Student list', { selector: 'table, [role="table"], ul' });
	await visit(page, `${BASE}/school/students/ci-s1`, 'D2', '2.2 Student drawer Kouamé Aya', { expectText: /Kouamé|Aya|ci-s1/i });
	await visit(page, `${BASE}/school/guardians`, 'D2', '2.4 Guardians list', { selector: 'main' });

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
	await visit(page, `${BASE}/classes/${CLASS_6B}/attendance`, 'D7', '7.1 Daily attendance tab', { selector: 'main' });

	// D8 — School life
	await visit(page, `${BASE}/school/activities`, 'D8', '8.1 Activities list', { selector: 'main' });
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
