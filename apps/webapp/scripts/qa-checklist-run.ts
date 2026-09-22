#!/usr/bin/env bun
/**
 * QA checklist runner — login, seed QA entities, smoke flows, reproduce known bugs.
 * Requires: webapp on :5173, API reachable, Playwright chromium.
 *
 * Env: WEBAPP_URL, QA_LOGIN_EMAIL, QA_LOGIN_PASSWORD
 */
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import type { Browser, Page } from 'playwright';
import { ensurePlaywrightChromium } from './playwright-browsers';
import {
	assertStackReady,
	attemptPasswordSignIn,
	waitForEnabled,
} from '../tests/integration/demo-dry-run/support/auth';
import { createDemoContext } from '../tests/integration/demo-dry-run/support/context';
import { DEMO_PASSWORD, STAFF_EMAIL, OWNER_EMAIL } from '../tests/integration/demo-dry-run/support/constants';
import { runDrawerTabChecks } from '../tests/integration/demo-dry-run/scenes/drawer-tabs';
import { runRouteCoverageScenes } from '../tests/integration/demo-dry-run/scenes/route-coverage';
import { DemoReporter } from '../tests/integration/demo-dry-run/support/reporter';
import { DEMO_WEBAPP_BASE, integrationUsesDemoLogin } from '../tests/integration/demo-dry-run/support/paths';
import type { DemoContext } from '../tests/integration/demo-dry-run/support/types';
import {
	fillFeeCreateDialog,
	fillStudentCreateDialog,
	listSearchInput,
	waitForDialogClosed,
	waitForPageQuery,
} from './qa-harness-ui';
import { waitForCommandPayload } from '../tests/integration/setup/journey-context';

const OUT_DIR = path.join(import.meta.dirname, '../../../..', '.qa-checklist-run');
const RESULTS_PATH = path.join(import.meta.dirname, '../../../..', 'qa-checklist-results.json');

export interface QaRowResult {
	page: string;
	probleme: string;
	etat: 'OK' | 'NOT OK' | 'N/A';
	detail?: string;
	suggestion?: string;
}

const qaResults: QaRowResult[] = [];
let lastCreatedStudentName = 'Eleve';

function record(
	page: string,
	probleme: string,
	etat: QaRowResult['etat'],
	detail?: string,
	suggestion?: string,
): void {
	qaResults.push({ page, probleme, etat, detail, suggestion });
	console.log(`[QA] ${etat} — ${page} — ${probleme}${detail ? ` — ${detail}` : ''}`);
}

function formatError(err: unknown): string {
	return err instanceof Error ? err.message : String(err);
}

/** Run a QA step; on failure record NOT OK and continue the run. */
async function runStep(
	page: string,
	probleme: string,
	fn: () => Promise<void>,
	suggestion?: string,
): Promise<void> {
	try {
		await fn();
	}
	catch (err) {
		record(page, probleme, 'NOT OK', formatError(err), suggestion);
	}
}

async function persistResults(base: string, consoleErrors: string[], reporter?: DemoReporter): Promise<void> {
	const summary = {
		generatedAt: new Date().toISOString(),
		base,
		passed: qaResults.filter(r => r.etat === 'OK').length,
		failed: qaResults.filter(r => r.etat === 'NOT OK').length,
		na: qaResults.filter(r => r.etat === 'N/A').length,
		consoleErrors: [...new Set(consoleErrors)].slice(0, 20),
		results: qaResults,
		dryRun: reporter?.summarize(consoleErrors),
	};
	await writeFile(RESULTS_PATH, JSON.stringify(summary, null, 2));
	if (reporter) {
		await reporter.writeResults(OUT_DIR, reporter.summarize(consoleErrors));
	}
}

async function waitForAppShell(page: Page): Promise<void> {
	await page.waitForSelector('aside#app-sidebar', { timeout: 30_000 });
	await waitForPageQuery(page);
}

async function dismissToasts(page: Page): Promise<void> {
	await page.keyboard.press('Escape').catch(() => {});
}

function checklistCredentials(): Array<{ email: string; password: string }> {
	const password = process.env.QA_LOGIN_PASSWORD ?? DEMO_PASSWORD;
	const emails = [
		process.env.QA_LOGIN_EMAIL,
		STAFF_EMAIL,
		OWNER_EMAIL,
	].filter((value): value is string => Boolean(value?.trim()));
	return emails.map(email => ({ email, password }));
}

async function qaSignIn(ctx: DemoContext): Promise<void> {
	const { page, base } = ctx;
	const credentials = checklistCredentials();
	const preferPassword = Boolean(process.env.QA_LOGIN_EMAIL) || !integrationUsesDemoLogin();

	if (!preferPassword) {
		await page.goto(`${base}/login/demo`, { waitUntil: 'domcontentloaded' });
		const demoBtn = page.getByRole('button', { name: /Jean-Baptiste|Aka|Aminata|Koné|directeur/i }).first();
		const hasDemo = await demoBtn.waitFor({ timeout: 12_000 }).then(() => true).catch(() => false);
		if (hasDemo) {
			await waitForEnabled(demoBtn);
			await demoBtn.click();
			const navigated = await page
				.waitForURL(/\/(dashboard|school|classes|configuration|onboarding|finance)/, { timeout: 45_000 })
				.then(() => true)
				.catch(() => false);
			if (navigated) {
				await page.waitForSelector('aside#app-sidebar, [data-onboarding-shell]', { timeout: 30_000 }).catch(() => {});
				return;
			}
		}
	}

	for (const { email, password } of credentials) {
		const ok = await attemptPasswordSignIn(page, base, email, password);
		if (ok) {
			await page.waitForSelector('aside#app-sidebar, [data-onboarding-shell]', { timeout: 30_000 }).catch(() => {});
			return;
		}
	}

	await ctx.shot('qa-login-failed');
	throw new Error('Login failed — set QA_LOGIN_EMAIL and QA_LOGIN_PASSWORD for your onboarded account');
}

async function createStudentViaUi(ctx: DemoContext): Promise<string | null> {
	const pageUrl = 'http://localhost:5173/school/students';
	const probleme = 'Création nouvel élève — bouton submit';

	try {
		const { page, base } = ctx;
		const stamp = Date.now();
		const firstName = 'QA';
		const lastName = `Eleve${stamp}`;
		lastCreatedStudentName = lastName;

		await page.goto(`${base}/school/students`, { waitUntil: 'domcontentloaded' });
		await waitForAppShell(page);

		const newBtn = page.getByRole('button', { name: /add student|ajouter un élève/i });
		if (!(await newBtn.isVisible({ timeout: 8_000 }).catch(() => false))) {
			record(pageUrl, probleme, 'NOT OK', 'Bouton Add student introuvable');
			return null;
		}
		await newBtn.click();

		const dialog = page.getByRole('dialog');
		await dialog.waitFor({ state: 'visible', timeout: 10_000 });

		const consoleErrors: string[] = [];
		const onConsole = (msg: { type: () => string; text: () => string }) => {
			if (msg.type() === 'error') {
				consoleErrors.push(msg.text());
			}
		};
		page.on('console', onConsole);

		const payloadPromise = waitForCommandPayload(page, 'register-student');
		try {
			await fillStudentCreateDialog(page, { firstName, lastName });
		}
		catch (err) {
			page.off('console', onConsole);
			record(pageUrl, probleme, 'NOT OK', formatError(err));
			return null;
		}

		await waitForDialogClosed(page);
		await waitForPageQuery(page);
		page.off('console', onConsole);

		const lifecycleBug = consoleErrors.some(text => /lifecycle_outside_component|getContext/i.test(text));
		if (lifecycleBug) {
			record(
				pageUrl,
				probleme,
				'NOT OK',
				consoleErrors.find(text => /lifecycle|getContext/i.test(text))?.slice(0, 300),
				'Passer createStudent en prop à StudentCreateModal au lieu de getStudentsPageState() dans submit',
			);
			return null;
		}

		const closed = !(await dialog.isVisible().catch(() => false));
		if (closed) {
			record(pageUrl, probleme, 'OK');
		}
		else {
			record(pageUrl, probleme, 'NOT OK', 'Modal toujours ouvert après submit');
			return null;
		}

		await listSearchInput(page).first().fill(`${firstName} ${lastName}`).catch(() => {});
		await page.waitForTimeout(1_500);

		const payload = await payloadPromise;
		if (typeof payload?.id === 'string' && payload.id.length > 0) {
			return payload.id;
		}

		const row = page.getByText(new RegExp(`${firstName}.*${lastName}|${lastName}`, 'i')).first();
		if (await row.isVisible({ timeout: 8_000 }).catch(() => false)) {
			const link = page.locator('a[href*="/school/students/"]').filter({ hasText: new RegExp(lastName, 'i') }).first();
			const href = await link.getAttribute('href').catch(() => null);
			const match = href?.match(/\/school\/students\/([^/]+)/);
			if (match?.[1]) {
				return match[1];
			}
		}

		return null;
	}
	catch (err) {
		record(pageUrl, probleme, 'NOT OK', formatError(err));
		return null;
	}
}

async function setStudentStatus(ctx: DemoContext, studentId: string, status: 'inactive' | 'archived'): Promise<boolean> {
	const { page, base } = ctx;
	await page.goto(`${base}/school/students/${studentId}/profile`, { waitUntil: 'domcontentloaded' });
	await waitForAppShell(page);

	const select = page.locator('select').filter({ has: page.locator('option[value="inactive"]') }).first();
	if (!(await select.isVisible({ timeout: 8_000 }).catch(() => false))) {
		return false;
	}
	await select.selectOption(status);
	await page.waitForTimeout(1_500);
	return true;
}

async function testStudentStatusFilter(ctx: DemoContext, inactiveStudentName: string): Promise<void> {
	const { page, base } = ctx;
	await page.goto(`${base}/school/students`, { waitUntil: 'domcontentloaded' });
	await waitForAppShell(page);

	const statusFilter = page.getByRole('combobox').filter({ hasText: /statut|status|tous|all/i }).first();
	if (!(await statusFilter.isVisible({ timeout: 5_000 }).catch(() => false))) {
		const filterBtn = page.getByRole('button', { name: /statut|status/i }).first();
		if (await filterBtn.isVisible().catch(() => false)) {
			await filterBtn.click();
		}
	}

	for (const status of ['inactive', 'archived'] as const) {
		await page.goto(`${base}/school/students?status=${status}`, { waitUntil: 'domcontentloaded' });
		await page.waitForTimeout(2_000);

		const hasStudent = await page.getByText(new RegExp(inactiveStudentName, 'i')).isVisible({ timeout: 5_000 }).catch(() => false);
		const emptyState = await page.getByText(/aucun|no student|empty|0 élève/i).isVisible({ timeout: 2_000 }).catch(() => false);

		if (status === 'inactive' && !hasStudent && emptyState) {
			record(
				'http://localhost:5173/school/students',
				"Filtre statut élève inactif / archivé",
				'NOT OK',
				`Filtre ${status}: élève inactif non visible dans la liste`,
				'Vérifier chargement roster complet quand status !== all (studentListUsesFullRoster)',
			);
		}
		else if (status === 'inactive' && hasStudent) {
			record(
				'http://localhost:5173/school/students',
				"Filtre statut élève inactif / archivé",
				'OK',
				'Élève inactif visible avec filtre inactive',
			);
		}
	}
}

async function testLoginErrorVisibility(base: string, browser: Browser): Promise<void> {
	const context = await browser.newContext();
	const page = await context.newPage();

	try {
		await page.goto(`${base}/login?panel=signin&method=password&stage=form`, {
			waitUntil: 'domcontentloaded',
		});

		const emailInput = page.locator('#login-password-email');
		const passwordInput = page.locator('#login-password');
		const submit = page
			.locator('form')
			.filter({ has: page.locator('#login-password-email') })
			.getByRole('button', { name: /sign in|se connecter/i });

		await waitForEnabled(emailInput);
		await waitForEnabled(passwordInput);
		await emailInput.fill(`missing-${Date.now()}@integration.edaya.test`);
		await passwordInput.fill('WrongPassword1!');
		await waitForEnabled(submit);
		await submit.click();

		const errorEl = page.locator('#login-password-error, [role="alert"]').first();
		const visible = await errorEl.waitFor({ state: 'visible', timeout: 15_000 }).then(() => true).catch(() => false);
		const color = visible
			? await errorEl.evaluate((element) => getComputedStyle(element).color)
			: '';
		const looksError = visible && await errorEl.evaluate((element) => {
			const className = typeof element.className === 'string' ? element.className : '';
			if (className.includes('destructive')) {
				return true;
			}
			const computed = getComputedStyle(element).color;
			const body = getComputedStyle(document.body).color;
			return computed !== body && computed !== 'rgba(0, 0, 0, 0)';
		}).catch(() => false);

		record(
			'http://localhost:5173/login',
			'Message d\'erreur login visible (rouge)',
			looksError ? 'OK' : 'NOT OK',
			looksError ? `Message visible (${color})` : 'Aucun message d\'erreur visible',
			'Message d\'erreur inline #login-password-error',
		);
	}
	catch (err) {
		record(
			'http://localhost:5173/login',
			'Message d\'erreur login visible (rouge)',
			'NOT OK',
			formatError(err),
		);
	}
	finally {
		await context.close();
	}
}

async function testOnboardingSemesterCalc(base: string, browser: Browser): Promise<void> {
	const context = await browser.newContext();
	const page = await context.newPage();

	try {
		await qaSignIn({ page, base, reporter: new DemoReporter(), shot: async () => {}, consoleErrors: [] } as DemoContext);
	}
	catch {
		record('http://localhost:5173/onboarding?step=1', 'Calcul auto dates semestre 1', 'N/A', 'Login requis — skip');
		await context.close();
		return;
	}

	await page.goto(`${base}/configuration/academic`, { waitUntil: 'domcontentloaded' });
	await waitForAppShell(page);

	const hasAcademic = await page.getByText(/année|academic|période|period/i).first().isVisible({ timeout: 8_000 }).catch(() => false);
	if (!hasAcademic) {
		record('http://localhost:5173/onboarding?step=1', 'Calcul auto dates semestre 1', 'N/A', 'Page academic non accessible');
		await context.close();
		return;
	}

	record(
		'http://localhost:5173/onboarding?step=1',
		'Calcul auto dates semestre 1 vs 2',
		'N/A',
		'Onboarding déjà fait — vérifier manuellement dans configuration/academic (wizard périodes)',
	);

	await context.close();
}

async function createFeeIfNeeded(ctx: DemoContext): Promise<string | null> {
	const pageUrl = 'http://localhost:5173/finance/fees';
	const probleme = 'CRUD frais — création QA';

	try {
		const { page, base } = ctx;
		const feeName = `QA-Frais-${Date.now()}`;

		await page.goto(`${base}/finance/fees`, { waitUntil: 'domcontentloaded' });
		await waitForAppShell(page);

		const existing = await page.getByText(/QA-Frais-/i).first().isVisible({ timeout: 3_000 }).catch(() => false);
		if (existing) {
			record(pageUrl, probleme, 'N/A', 'Frais QA déjà présent');
			return 'qa-fee-existing';
		}

		const newBtn = page.getByRole('button', { name: /add fee|ajouter un frais/i }).first();
		if (!(await newBtn.isVisible({ timeout: 5_000 }).catch(() => false))) {
			record(pageUrl, probleme, 'NOT OK', 'Bouton Add fee introuvable');
			return null;
		}
		await newBtn.click();

		const dialog = page.getByRole('dialog');
		await dialog.waitFor({ state: 'visible', timeout: 8_000 });

		await fillFeeCreateDialog(page, feeName, '50000');
		const save = dialog.getByTestId('form-modal-submit')
			.or(dialog.getByRole('button', { name: /save changes|^save$|enregistrer/i }))
			.last();
		await waitForEnabled(save);
		await save.click({ timeout: 15_000 });
		await waitForDialogClosed(page);
		await waitForPageQuery(page);

		const ok = await page.getByText(feeName).isVisible({ timeout: 8_000 }).catch(() => false);
		record(pageUrl, probleme, ok ? 'OK' : 'NOT OK', ok ? feeName : 'Frais non visible après création');
		return ok ? feeName : null;
	}
	catch (err) {
		record(pageUrl, probleme, 'NOT OK', formatError(err));
		return null;
	}
}

async function visitChecklistRoutes(ctx: DemoContext, studentId: string | null): Promise<void> {
	const { base } = ctx;
	const routes: Array<{ page: string; probleme: string; path: string }> = [
		{ page: 'http://localhost:5173/dashboard', probleme: 'Dashboard charge', path: '/dashboard' },
		{ page: 'http://localhost:5173/school/students', probleme: 'Liste élèves', path: '/school/students' },
		{ page: 'http://localhost:5173/school/guardians', probleme: 'Liste tuteurs', path: '/school/guardians' },
		{ page: 'http://localhost:5173/school/staff', probleme: 'Liste personnel', path: '/school/staff' },
		{ page: 'http://localhost:5173/school/teachers', probleme: 'Liste enseignants', path: '/school/teachers' },
		{ page: 'http://localhost:5173/school/calendar', probleme: 'Calendrier', path: '/school/calendar' },
		{ page: 'http://localhost:5173/school/activities', probleme: 'Activités', path: '/school/activities' },
		{ page: 'http://localhost:5173/school/announcements', probleme: 'Annonces', path: '/school/announcements' },
		{ page: 'http://localhost:5173/school/events', probleme: 'Incidents', path: '/school/events' },
		{ page: 'http://localhost:5173/finance/fees', probleme: 'Frais', path: '/finance/fees' },
		{ page: 'http://localhost:5173/finance/billing', probleme: 'Facturation', path: '/finance/billing' },
		{ page: 'http://localhost:5173/finance/payment', probleme: 'Paiements', path: '/finance/payment' },
		{ page: 'http://localhost:5173/configuration/school', probleme: 'Config école', path: '/configuration/school' },
		{ page: 'http://localhost:5173/configuration/academic', probleme: 'Config académique', path: '/configuration/academic' },
		{ page: 'http://localhost:5173/configuration/grade-levels', probleme: 'Niveaux', path: '/configuration/grade-levels' },
		{ page: 'http://localhost:5173/configuration/classes', probleme: 'Classes', path: '/configuration/classes' },
		{ page: 'http://localhost:5173/configuration/subjects', probleme: 'Matières', path: '/configuration/subjects' },
		{ page: 'http://localhost:5173/configuration/other/grade-scales', probleme: 'Barèmes', path: '/configuration/other/grade-scales' },
		{ page: 'http://localhost:5173/configuration/tools', probleme: 'Outils / imports', path: '/configuration/tools' },
		{ page: 'http://localhost:5173/account/inbox', probleme: 'Boîte de réception', path: '/account/inbox' },
		{ page: 'http://localhost:5173/account/notifications', probleme: 'Préférences notifications', path: '/account/notifications' },
	];

	const studentTabs = ['profile', 'grades', 'attendance', 'incidents', 'finances', 'report-card', 'enrollments', 'documents'] as const;

	for (const route of routes) {
		try {
			await ctx.page.goto(`${base}${route.path}`, { waitUntil: 'domcontentloaded', timeout: 45_000 });
			await waitForAppShell(ctx.page);
			const fatal = await ctx.page.locator('[data-testid="data-state-error"], .text-destructive:has-text("erreur")').first().isVisible({ timeout: 2_000 }).catch(() => false);
			record(route.page, route.probleme, fatal ? 'NOT OK' : 'OK', fatal ? 'État erreur visible' : undefined);
		}
		catch (err) {
			record(route.page, route.probleme, 'NOT OK', err instanceof Error ? err.message : String(err));
		}
	}

	if (studentId) {
		await ctx.page.goto(`${base}/school/students/${studentId}/profile`, { waitUntil: 'domcontentloaded', timeout: 45_000 });
		await waitForAppShell(ctx.page);
		const classLinks = await ctx.page.locator('a[href*="/classes/"]').all();
		let classId: string | null = null;
		for (const link of classLinks.slice(0, 5)) {
			const href = await link.getAttribute('href');
			const match = href?.match(/\/classes\/([^/]+)/);
			if (match) {
				classId = match[1];
				break;
			}
		}

		for (const tab of studentTabs) {
			const url = `http://localhost:5173/school/students/${studentId}/${tab}`;
			try {
				await ctx.page.goto(`${base}/school/students/${studentId}/${tab}`, { waitUntil: 'domcontentloaded', timeout: 45_000 });
				await waitForAppShell(ctx.page);
				const fatal = await ctx.page.locator('[data-testid="data-state-error"]').first().isVisible({ timeout: 2_000 }).catch(() => false);
				record(url, `Onglet élève ${tab}`, fatal ? 'NOT OK' : 'OK', fatal ? 'Erreur onglet' : undefined);
			}
			catch (err) {
				record(url, `Onglet élève ${tab}`, 'NOT OK', err instanceof Error ? err.message : String(err));
			}
		}

		if (classId) {
			const classRoutes = ['students', 'timetable', 'teaching', 'evaluations', 'attendance', 'report-cards'] as const;
			for (const seg of classRoutes) {
				const pageUrl = `http://localhost:5173/classes/${classId}/${seg}`;
				try {
					await ctx.page.goto(`${base}/classes/${classId}/${seg}`, { waitUntil: 'domcontentloaded', timeout: 45_000 });
					await waitForAppShell(ctx.page);
					const fatal = await ctx.page.locator('[data-testid="data-state-error"]').first().isVisible({ timeout: 2_000 }).catch(() => false);
					record(pageUrl, `Classe ${seg}`, fatal ? 'NOT OK' : 'OK');
				}
				catch (err) {
					record(pageUrl, `Classe ${seg}`, 'NOT OK', err instanceof Error ? err.message : String(err));
				}
			}
		}
	}
}

function mapDryRunToQa(dryRunResults: DemoReporter): void {
	for (const r of dryRunResults.results) {
		if (r.status === 'pass') {
			continue;
		}
		const page = r.step.includes('/') ? `http://localhost:5173${r.step}` : `http://localhost:5173/ (scene ${r.scene})`;
		record(page, `[dry-run] ${r.scene} ${r.step}`, r.status === 'skip' ? 'N/A' : 'NOT OK', r.detail);
	}
}

async function main(): Promise<void> {
	ensurePlaywrightChromium();
	const base = process.env.WEBAPP_URL ?? DEMO_WEBAPP_BASE;
	await mkdir(OUT_DIR, { recursive: true });

	console.log(`QA checklist run — ${base}`);

	let stackReady = true;
	try {
		await assertStackReady(base);
	}
	catch (err) {
		stackReady = false;
		record('http://localhost:5173/', 'Stack prête (webapp)', 'NOT OK', formatError(err));
	}

	const { chromium } = await import('playwright');
	const browser = await chromium.launch({ headless: true });
	const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
	const page = await context.newPage();
	const consoleErrors: string[] = [];
	page.on('console', msg => {
		if (msg.type() === 'error') {
			consoleErrors.push(msg.text());
		}
	});

	const reporter = new DemoReporter();
	const ctx = createDemoContext(page, base, OUT_DIR, reporter, consoleErrors);

	let loggedIn = false;

	if (stackReady) {
		await runStep('http://localhost:5173/login', 'Login OK', async () => {
			await qaSignIn(ctx);
			loggedIn = true;
			record('http://localhost:5173/login', 'Login OK', 'OK');
		});
	}
	else {
		record('http://localhost:5173/login', 'Login OK', 'NOT OK', 'Webapp non joignable');
	}

	await runStep('http://localhost:5173/login', 'Message d\'erreur login visible (rouge)', async () => {
		await testLoginErrorVisibility(base, browser);
	});

	let studentId: string | null = null;

	if (loggedIn) {
		studentId = await createStudentViaUi(ctx);

		await runStep(
			'http://localhost:5173/school/students',
			'Passage élève en statut inactif',
			async () => {
				if (!studentId) {
					record(
						'http://localhost:5173/school/students',
						'Passage élève en statut inactif',
						'N/A',
						'Aucun élève QA créé',
					);
					return;
				}
				const ok = await setStudentStatus(ctx, studentId, 'inactive');
				if (!ok) {
					throw new Error('Select statut introuvable sur le profil élève');
				}
			},
		);

		await runStep(
			'http://localhost:5173/school/students',
			"Filtre statut élève inactif / archivé",
			async () => {
				if (!studentId) {
					record(
						'http://localhost:5173/school/students',
						"Filtre statut élève inactif / archivé",
						'N/A',
						'Aucun élève QA créé',
					);
					return;
				}
				await testStudentStatusFilter(ctx, lastCreatedStudentName);
			},
		);

		await createFeeIfNeeded(ctx);

		await runStep('http://localhost:5173/', 'Parcours checklist routes', async () => {
			await visitChecklistRoutes(ctx, studentId);
		});

		const usesDemoSeed = !process.env.QA_LOGIN_EMAIL;
		if (usesDemoSeed) {
			await runStep('http://localhost:5173/', 'Dry-run route coverage', async () => {
				await runRouteCoverageScenes(ctx);
			});

			await runStep('http://localhost:5173/', 'Dry-run drawer tabs', async () => {
				await runDrawerTabChecks(ctx);
				mapDryRunToQa(reporter);
			});
		}
		else {
			record(
				'http://localhost:5173/',
				'Dry-run route coverage',
				'N/A',
				'Scènes demo-ci ignorées (tenant provisionné)',
			);
			record(
				'http://localhost:5173/',
				'Dry-run drawer tabs',
				'N/A',
				'Scènes demo-ci ignorées (tenant provisionné)',
			);
		}
	}

	await runStep('http://localhost:5173/onboarding?step=1', 'Calcul auto dates semestre 1 vs 2', async () => {
		await testOnboardingSemesterCalc(base, browser);
	});

	await persistResults(base, consoleErrors, reporter);

	const failed = qaResults.filter(r => r.etat === 'NOT OK').length;
	const passed = qaResults.filter(r => r.etat === 'OK').length;
	const na = qaResults.filter(r => r.etat === 'N/A').length;

	console.log(`\n--- QA Summary ---`);
	console.log(`OK: ${passed}  NOT OK: ${failed}  N/A: ${na}`);
	console.log(`Results: ${RESULTS_PATH}`);

	const xlsxScript = path.join(import.meta.dirname, 'update-qa-xlsx.py');
	const py = spawnSync('python3', [xlsxScript], {
		cwd: path.join(import.meta.dirname, '..'),
		stdio: 'inherit',
	});
	if (py.status !== 0) {
		console.warn('update-qa-xlsx.py failed — results JSON is still available');
	}

	await context.close();
	await browser.close();

	process.exit(failed > 0 ? 1 : 0);
}

main().catch(async (err) => {
	console.error('QA run fatal:', err);
	record('http://localhost:5173/', 'Run fatal', 'NOT OK', formatError(err));
	try {
		await persistResults(process.env.WEBAPP_URL ?? DEMO_WEBAPP_BASE, []);
	}
	catch {
		// ignore
	}
	process.exit(1);
});
