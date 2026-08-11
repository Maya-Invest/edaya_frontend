#!/usr/bin/env bun
/**
 * Exécute les scénarios de qa-template-matrix.ts via Playwright.
 * Écrit qa-matrix-results.json puis régénère qa-test-matrix.xlsx.
 *
 * Policy: on NOT OK — log blocker, continue, exit 1. Never edit src/ to green the run.
 *
 * Env: WEBAPP_URL, QA_LOGIN_EMAIL, QA_LOGIN_PASSWORD
 * Provisioned runs: INTEGRATION_PROVISIONED=1, QA_MATRIX_EXCLUDE_MODULES=Onboarding
 */
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { chromium } from 'playwright';
import { assertStackReady, attemptPasswordSignIn } from '../tests/integration/demo-dry-run/support/auth';
import { createDemoContext } from '../tests/integration/demo-dry-run/support/context';
import { DEMO_PASSWORD, OWNER_EMAIL, STAFF_EMAIL } from '../tests/integration/demo-dry-run/support/constants';
import { DEMO_WEBAPP_BASE } from '../tests/integration/demo-dry-run/support/paths';
import { DemoReporter } from '../tests/integration/demo-dry-run/support/reporter';
import { QA_TEMPLATE_MATRIX } from './qa-template-matrix';
import { waitForAppShell } from './qa-matrix-support';
import { discoverEntities, emptyEntities, runMatrixScenario } from './qa-matrix-scenarios';
import type { MatrixResult } from './qa-matrix-support';
import type { ProvisionedTenant } from '../tests/integration/support/api-provision';
import { loadSetupEntities, runWebTenantSetup } from '../tests/integration/setup/web-tenant-setup';
import { STUDENT_SETUP_BLOCKER, studentSetupBlockerReport } from '../tests/integration/setup/setup-blockers';
import {
	INTEGRATION_POLICY,
	countByActionType,
	printBlockers,
	toBlockers,
	type BlockerReport,
} from './integration-report';

const ROOT = path.join(import.meta.dirname, '../../../..');
const WEBAPP_DIR = path.join(import.meta.dirname, '..');
const OUT_DIR = path.join(ROOT, '.qa-matrix-run');
const RESULTS_PATH = path.join(ROOT, 'qa-matrix-results.json');
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

function filterMatrix(): typeof QA_TEMPLATE_MATRIX {
	const excluded = excludedModules();
	if (excluded.size === 0) {
		return QA_TEMPLATE_MATRIX;
	}

	return QA_TEMPLATE_MATRIX.filter(row => !excluded.has(row.module));
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
	return attemptPasswordSignIn(page, base, email, password);
}

async function qaSignIn(
	ctx: ReturnType<typeof createDemoContext>,
	credentials: FixtureCredentials | null,
): Promise<void> {
	const { page, base } = ctx;

	if (isProvisionedRun() && credentials) {
		const ok = await loginWithPassword(page, base, credentials.email, credentials.password);
		if (ok) {
			await waitForAppShell(page).catch(() => {});
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
		await waitForAppShell(page).catch(() => {});
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
			await waitForAppShell(page).catch(() => {});
			return;
		}
	}

	throw new Error('Login échoué — définir QA_LOGIN_EMAIL et QA_LOGIN_PASSWORD');
}

async function main(): Promise<void> {
	const base = process.env['WEBAPP_URL'] ?? DEMO_WEBAPP_BASE;
	const matrix = filterMatrix();
	const excluded = [...excludedModules()];
	const credentials = await loadProvisionedCredentials();

	await mkdir(OUT_DIR, { recursive: true });

	console.log(`QA matrix run — ${matrix.length} scénarios — ${base}`);
	if (excluded.length > 0) {
		console.log(`Excluded modules: ${excluded.join(', ')}`);
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

	console.log('\n--- Phase Auth ---');
	for (const row of authRows) {
		record(await runMatrixScenario(row, ctx, browser, entities));
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
		const setup = await runWebTenantSetup(ctx);
		Object.assign(entities, setup.entities, await loadSetupEntities());
		entities.onboarded = true;
		if (setup.steps.some(s => s.blocked)) {
			entities.studentSetupBlocked = true;
		}
	}

	console.log('\n--- Découverte entités ---');
	const discovered = await discoverEntities(ctx);
	Object.assign(entities, discovered);
	console.log(
		`IDs: class=${entities.classId ?? '-'} student=${entities.studentId ?? '-'} eval=${entities.evaluationId ?? '-'}`,
	);

	console.log('\n--- Phase Application ---');
	let prevModule = '';
	for (const row of appRows) {
		if (prevModule === 'Shell' && row.module !== 'Shell') {
			console.log('--- Re-login après tests Shell ---');
			await qaSignIn(ctx, credentials);
			Object.assign(entities, await discoverEntities(ctx));
		}
		record(await runMatrixScenario(row, ctx, browser, entities));
		prevModule = row.module;
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
		setupPhase: isProvisionedRun() ? 'web-configuration-and-entities' : undefined,
		policy: isProvisionedRun() ? INTEGRATION_POLICY : undefined,
		apiCreates: isProvisionedRun() ? ['user', 'school'] : undefined,
		apiFlags: isProvisionedRun() ? ['wizardCompleted'] : undefined,
		byModule,
		byActionType,
		blockers,
		consoleErrors: [...new Set(consoleErrors)].slice(0, 30),
		results,
	};

	await writeFile(RESULTS_PATH, JSON.stringify(summary, null, 2));

	if (isProvisionedRun()) {
		await mkdir(path.dirname(INTEGRATION_SUMMARY_PATH), { recursive: true });
		await writeFile(INTEGRATION_SUMMARY_PATH, JSON.stringify({
			generatedAt: summary.generatedAt,
			provisioningMode: PROVISIONING_MODE,
			setupPhase: 'web-configuration-and-entities',
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
		console.log(`Excluded modules: ${excluded.join(', ')}`);
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
