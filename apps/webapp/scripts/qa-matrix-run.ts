#!/usr/bin/env bun
/**
 * Exécute les scénarios de qa-template-matrix.ts via Playwright.
 * Écrit apps/webapp/.integration-run/qa-matrix-results.json puis régénère qa-test-matrix.xlsx.
 *
 * Policy: on NOT OK — log blocker, continue, exit 1. Never edit src/ to green the run.
 *
 * Env: WEBAPP_URL, QA_LOGIN_EMAIL, QA_LOGIN_PASSWORD
 * Provisioned runs (canonical integration contract): INTEGRATION_PROVISIONED=1
 *   → bun run test:integration:provisioned
 *   UI journey records matrix rows as it goes; leftover unclaimed rows still run.
 * Demo smoke (local only): bun run qa:matrix
 * Always excluded (manual): Auth, Onboarding, Outils & imports, /login, /configuration/tools
 */
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { chromium } from 'playwright';
import { ensurePlaywrightChromium } from './playwright-browsers';
import { assertStackReady, attemptPasswordSignIn } from '../tests/integration/demo-dry-run/support/auth';
import { createDemoContext } from '../tests/integration/demo-dry-run/support/context';
import { DEMO_PASSWORD, OWNER_EMAIL, STAFF_EMAIL } from '../tests/integration/demo-dry-run/support/constants';
import { DEMO_WEBAPP_BASE } from '../tests/integration/demo-dry-run/support/paths';
import { DemoReporter } from '../tests/integration/demo-dry-run/support/reporter';
import { QA_TEMPLATE_MATRIX_RUNNABLE } from './qa-template-matrix';
import { defaultExcludedModulesForRun } from './qa-matrix-exclusions';
import type { QaTemplateRow } from './qa-template-matrix.manual';
import { clearAcademicSelectionStorage } from './qa-harness-ui';
import { waitForAppShell, mergeEntities } from './qa-matrix-support';
import { discoverEntities, emptyEntities, runLogoutShellScenario, runMatrixScenario } from './qa-matrix-scenarios';
import type { MatrixResult } from './qa-matrix-support';
import type { ProvisionedTenant } from '../tests/integration/support/api-provision';
import { loadSetupEntities, runUiJourney } from '../tests/integration/setup/ui-flow-runner';
import { studentSetupBlockerReport } from '../tests/integration/setup/setup-blockers';
import {
	INTEGRATION_POLICY,
	countByActionType,
	printBlockers,
	toBlockers,
	type BlockerReport,
} from './integration-report';

const WEBAPP_DIR = path.join(import.meta.dirname, '..');
const OUT_DIR = path.join(WEBAPP_DIR, '.qa-matrix-run');
const RESULTS_PATH = path.join(WEBAPP_DIR, '.integration-run', 'qa-matrix-results.json');
const FIXTURE_PATH = path.join(WEBAPP_DIR, '.integration-run', 'fixture.json');
const INTEGRATION_SUMMARY_PATH = path.join(WEBAPP_DIR, '.integration-run', 'summary.json');

const PROVISIONING_MODE = 'school-via-api-wizard-flag-via-api';

interface FixtureCredentials {
	email: string;
	password: string;
}

function isProvisionedRun(): boolean {
	return process.env['INTEGRATION_PROVISIONED'] === '1';
}

function excludedModules(): Set<string> {
	return new Set(
		(process.env['QA_MATRIX_EXCLUDE_MODULES'] ?? '')
			.split(',')
			.map(m => m.trim())
			.filter(Boolean),
	);
}

function filterMatrix(): QaTemplateRow[] {
	const extra = excludedModules();
	if (extra.size === 0) {
		return [...QA_TEMPLATE_MATRIX_RUNNABLE];
	}
	return QA_TEMPLATE_MATRIX_RUNNABLE.filter(row => !extra.has(row.module));
}

async function loadProvisionedCredentials(): Promise<FixtureCredentials | null> {
	if (!isProvisionedRun()) {
		return null;
	}

	if (process.env['QA_LOGIN_EMAIL'] && process.env['QA_LOGIN_PASSWORD']) {
		return {
			email: process.env['QA_LOGIN_EMAIL'],
			password: process.env['QA_LOGIN_PASSWORD'],
		};
	}

	try {
		const raw = await readFile(FIXTURE_PATH, 'utf8');
		const fixture = JSON.parse(raw) as ProvisionedTenant;
		process.env['QA_LOGIN_EMAIL'] = fixture.email;
		process.env['QA_LOGIN_PASSWORD'] = fixture.password;
		return { email: fixture.email, password: fixture.password };
	}
	catch {
		return null;
	}
}

async function loginWithPassword(
	page: import('playwright').Page,
	base: string,
	email: string,
	password: string,
): Promise<boolean> {
	const ok = await attemptPasswordSignIn(page, base, email, password);
	if (ok) {
		await clearAcademicSelectionStorage(page);
	}
	return ok;
}

async function qaSignIn(
	ctx: ReturnType<typeof createDemoContext>,
	credentials: FixtureCredentials | null,
): Promise<void> {
	const { page, base } = ctx;

	if (isProvisionedRun() && credentials) {
		const ok = await loginWithPassword(page, base, credentials.email, credentials.password);
		if (ok) {
			await waitForAppShell(page);
			return;
		}
		throw new Error(`Login échoué pour ${credentials.email}`);
	}

	const emails = [process.env['QA_LOGIN_EMAIL'], STAFF_EMAIL, OWNER_EMAIL].filter(
		(v): v is string => Boolean(v?.trim()),
	);

	await page.goto(`${base}/login/demo`, { waitUntil: 'domcontentloaded' });
	const demoBtn = page.getByRole('button', { name: /Jean-Baptiste|Aka|Aminata|Koné|directeur/i }).first();
	if (await demoBtn.waitFor({ timeout: 20_000 }).then(() => true).catch(() => false)) {
		await demoBtn.click();
		await page.waitForURL(/\/(dashboard|school|classes|configuration|onboarding|finance)/, { timeout: 45_000 });
		await waitForAppShell(page);
		return;
	}

	for (const email of emails) {
		const ok = await loginWithPassword(
			page,
			base,
			email,
			process.env['QA_LOGIN_PASSWORD'] ?? DEMO_PASSWORD,
		);
		if (ok) {
			await waitForAppShell(page);
			return;
		}
	}

	throw new Error('Login échoué — définir QA_LOGIN_EMAIL et QA_LOGIN_PASSWORD');
}

async function main(): Promise<void> {
	ensurePlaywrightChromium();
	const base = process.env['WEBAPP_URL'] ?? DEMO_WEBAPP_BASE;
	const matrix = filterMatrix();
	const excluded = [...defaultExcludedModulesForRun(), ...excludedModules()];
	const credentials = await loadProvisionedCredentials();

	await mkdir(OUT_DIR, { recursive: true });
	await mkdir(path.dirname(RESULTS_PATH), { recursive: true });

	console.log(`QA matrix run — ${matrix.length} scénarios — ${base}`);
	if (!isProvisionedRun()) {
		console.warn(
			'⚠ Local demo smoke — not the canonical integration contract. Use: bun run test:integration:provisioned',
		);
	}
	if (excluded.length > 0) {
		console.log(`Excluded from automated run: ${excluded.join(', ')}`);
	}
	if (isProvisionedRun() && credentials) {
		console.log(`Provisioned login: ${credentials.email}`);
	}

	const results: MatrixResult[] = [];
	const record = (r: MatrixResult) => {
		results.push(r);
		const tag = r.statut === 'OK' ? '✓' : r.statut === 'N/A' ? '○' : '✗';
		console.log(`${tag} [${r.module}] ${r.action.slice(0, 60)}${r.detail ? ` — ${r.detail.slice(0, 80)}` : ''}`);
	};
	const replaceResult = (r: MatrixResult) => {
		const idx = results.findIndex(
			entry => entry.module === r.module && entry.endpoint === r.endpoint && entry.action === r.action,
		);
		if (idx >= 0) {
			results[idx] = r;
		}
		else {
			results.push(r);
		}
		const tag = r.statut === 'OK' ? '✓' : r.statut === 'N/A' ? '○' : '✗';
		console.log(`${tag} [${r.module}] ${r.action.slice(0, 60)}${r.detail ? ` — ${r.detail.slice(0, 80)}` : ''}`);
	};

	try {
		await assertStackReady(base);
	}
	catch (err) {
		const detail = err instanceof Error ? err.message : String(err);
		for (const row of matrix) {
			record({
				module: row.module,
				endpoint: row.endpoint,
				action: row.action,
				statut: 'NOT OK',
				detail: `Stack indisponible: ${detail}`,
			});
		}
		await mkdir(path.dirname(RESULTS_PATH), { recursive: true });
		await writeFile(RESULTS_PATH, JSON.stringify({
			generatedAt: new Date().toISOString(),
			base,
			excludedModules: excluded,
			provisioningMode: isProvisionedRun() ? PROVISIONING_MODE : undefined,
			policy: isProvisionedRun() ? INTEGRATION_POLICY : undefined,
			results,
		}, null, 2));
		console.error('Stack non prête — tous les tests marqués NOT OK');
		process.exit(1);
	}

	const browser = await chromium.launch({ headless: true });
	const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
	const page = await context.newPage();
	const consoleErrors: string[] = [];
	page.on('console', msg => {
		if (msg.type() === 'error') consoleErrors.push(msg.text());
	});

	const reporter = new DemoReporter();
	const ctx = createDemoContext(page, base, OUT_DIR, reporter, consoleErrors);
	const entities = emptyEntities();
	if (isProvisionedRun()) {
		entities.hasDemoLogin = false;
	}

	const authRows = matrix.filter(r => r.module === 'Auth');
	const appRows = matrix.filter(r => r.module !== 'Auth');

	if (authRows.length > 0) {
		console.log('\n--- Phase Auth ---');
		for (const row of authRows) {
			record(await runMatrixScenario(row, ctx, browser, entities));
		}
	}

	console.log('\n--- Login session ---');
	try {
		await qaSignIn(ctx, credentials);
		entities.onboarded = !page.url().includes('/onboarding');
		console.log('Session OK');
	}
	catch (err) {
		const detail = err instanceof Error ? err.message : String(err);
		console.error(`Login session échoué: ${detail}`);
		for (const row of appRows) {
			record({
				module: row.module,
				endpoint: row.endpoint,
				action: row.action,
				statut: 'NOT OK',
				detail: `Session requise: ${detail}`,
			});
		}
		await persistAndExit(base, results, consoleErrors, browser, excluded, []);
		return;
	}

	if (isProvisionedRun()) {
		console.log('\n--- UI journey ---');
		const journey = await runUiJourney(ctx, appRows, record);
		const setupEntities = { ...journey.entities, ...(await loadSetupEntities()) };
		Object.assign(entities, setupEntities);
		entities.onboarded = true;
		if (journey.steps.some(s => s.blocked)) {
			entities.studentSetupBlocked = true;
		}
		if (!journey.structureOk) {
			console.error('Journey fail-fast: school structure incomplete');
		}
		if (entities.secondaryAccounts) {
			try {
				const raw = await readFile(FIXTURE_PATH, 'utf8');
				const fixture = JSON.parse(raw) as ProvisionedTenant;
				fixture.secondaryAccounts = entities.secondaryAccounts;
				await writeFile(FIXTURE_PATH, JSON.stringify(fixture, null, 2));
			}
			catch {
				// fixture optional if provisioning failed early
			}
		}
	}
	else {
		console.log('\n--- Découverte entités ---');
		const discovered = await discoverEntities(ctx);
		Object.assign(entities, mergeEntities(discovered, entities));
	}
	console.log(
		`IDs: class=${entities.classId ?? '-'} student=${entities.studentId ?? '-'} eval=${entities.evaluationId ?? '-'}`,
	);

	console.log('\n--- Phase Application (unclaimed rows) ---');
	let prevModule = '';
	try {
		for (const row of appRows) {
			if (isProvisionedRun() && results.some(r =>
				r.module === row.module && r.endpoint === row.endpoint && r.action === row.action
			)) {
				continue;
			}
			if (isProvisionedRun() && row.module === 'Shell' && row.action === 'Logout') {
				continue;
			}
			if (prevModule === 'Shell' && row.module !== 'Shell') {
				console.log('--- Re-login après tests Shell ---');
				let signedIn = false;
				for (let attempt = 1; attempt <= 3; attempt++) {
					try {
						await qaSignIn(ctx, credentials);
						signedIn = true;
						break;
					}
					catch (err) {
						console.error(
							`Re-login attempt ${attempt}/3 failed:`,
							err instanceof Error ? err.message : err,
						);
						await ctx.page.waitForTimeout(3_000);
					}
				}
				if (!signedIn) {
					throw new Error('Re-login failed after Shell tests');
				}
			}
			record(await runMatrixScenario(row, ctx, browser, entities));
			prevModule = row.module;
		}
	}
	catch (err) {
		console.error(
			'Unclaimed phase failed; persisting journey results:',
			err instanceof Error ? err.message : err,
		);
	}

	if (isProvisionedRun()) {
		const logoutRow = appRows.find(r => r.module === 'Shell' && r.action === 'Logout');
		if (logoutRow) {
			console.log('\n--- Logout (fin de session provisioned) ---');
			replaceResult(await runLogoutShellScenario(logoutRow, ctx));
		}
	}

	const setupBlockers = entities.studentSetupBlocked ? [studentSetupBlockerReport()] : [];
	await persistAndExit(base, results, consoleErrors, browser, excluded, setupBlockers);
}

async function persistAndExit(
	base: string,
	results: MatrixResult[],
	consoleErrors: string[],
	browser: Awaited<ReturnType<typeof chromium.launch>>,
	excluded: string[] = [],
	setupBlockers: BlockerReport[] = [],
): Promise<void> {
	const passed = results.filter(r => r.statut === 'OK').length;
	const failed = results.filter(r => r.statut === 'NOT OK').length;
	const na = results.filter(r => r.statut === 'N/A').length;

	const byModule: Record<string, { ok: number; notOk: number; na: number }> = {};
	for (const row of results) {
		const bucket = byModule[row.module] ?? { ok: 0, notOk: 0, na: 0 };
		if (row.statut === 'OK') bucket.ok += 1;
		else if (row.statut === 'N/A') bucket.na += 1;
		else bucket.notOk += 1;
		byModule[row.module] = bucket;
	}

	const blockers = [...setupBlockers, ...toBlockers(results)];
	const byActionType = countByActionType(results);

	const summary = {
		generatedAt: new Date().toISOString(),
		base,
		passed,
		failed,
		na,
		total: results.length,
		excludedModules: excluded.length > 0 ? excluded : undefined,
		provisioningMode: isProvisionedRun() ? PROVISIONING_MODE : undefined,
		setupPhase: isProvisionedRun() ? 'ui-journey-then-unclaimed-matrix' : undefined,
		policy: isProvisionedRun() ? INTEGRATION_POLICY : undefined,
		apiCreates: isProvisionedRun() ? ['user', 'school'] : undefined,
		apiFlags: isProvisionedRun() ? ['wizardCompleted'] : undefined,
		byModule,
		byActionType,
		blockers,
		consoleErrors: [...new Set(consoleErrors)].slice(0, 30),
		results,
	};

	await mkdir(path.dirname(RESULTS_PATH), { recursive: true });
	await writeFile(RESULTS_PATH, JSON.stringify(summary, null, 2));

	if (isProvisionedRun()) {
		await mkdir(path.dirname(INTEGRATION_SUMMARY_PATH), { recursive: true });
		await writeFile(INTEGRATION_SUMMARY_PATH, JSON.stringify({
			generatedAt: summary.generatedAt,
			provisioningMode: PROVISIONING_MODE,
			setupPhase: 'ui-journey-then-unclaimed-matrix',
			policy: INTEGRATION_POLICY,
			apiCreates: ['user', 'school'],
			apiFlags: ['wizardCompleted'],
			excludedModules: excluded,
			matrix: {
				base,
				passed,
				failed,
				na,
				total: results.length,
				byModule,
				byActionType,
			},
			blockers,
		}, null, 2));
	}

	console.log(`\n--- Résumé ---`);
	console.log(`OK: ${passed}  NOT OK: ${failed}  N/A: ${na}  Total: ${results.length}`);
	if (excluded.length > 0) {
		console.log(`Excluded from automated run: ${excluded.join(', ')}`);
	}
	for (const [module, counts] of Object.entries(byModule)) {
		console.log(`${module}: ${counts.ok} OK, ${counts.na} N/A, ${counts.notOk} NOT OK`);
	}
	printBlockers(blockers);
	console.log(`Résultats: ${RESULTS_PATH}`);

	const gen = spawnSync('bun', ['run', 'qa:template'], {
		cwd: path.join(import.meta.dirname, '..'),
		stdio: 'inherit',
		shell: true,
	});
	if (gen.status !== 0) {
		console.warn('qa:template a échoué — JSON disponible');
	}

	await browser.close();
	process.exit(failed > 0 ? 1 : 0);
}

main().catch(err => {
	console.error('Fatal:', err);
	process.exit(1);
});
