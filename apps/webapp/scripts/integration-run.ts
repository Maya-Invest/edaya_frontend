#!/usr/bin/env bun
/**
 * Full provisioned integration pipeline:
 *   1. API provision (user + school + wizard flag)
 *   2. Playwright UI journey (structure → configuration → people → school → teaching → class/finance)
 *   3. Unclaimed QA matrix rows (journey already recorded coverage)
 *   4. Summary report in .integration-run/summary.json
 *
 * Policy: on NOT OK — log blockers, do not edit src/. See integration-report.ts.
 *
 * Prerequisites:
 *   - API at API_URL (default http://localhost:9999)
 *   - Webapp at WEBAPP_URL (default http://localhost:5173) — bun dev
 *   - Playwright chromium installed: bunx playwright install chromium
 *
 * Canonical integration contract: bun run test:integration:provisioned
 * Local demo smoke only: bun run qa:matrix (warns when INTEGRATION_PROVISIONED is unset)
 */
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { provisionTenant } from '../tests/integration/support/api-provision';
import { defaultExcludedModulesForRun } from './qa-matrix-exclusions';
import { INTEGRATION_POLICY, printBlockers, type BlockerReport } from './integration-report';

const WEBAPP_DIR = path.join(import.meta.dirname, '..');
const OUT_DIR = path.join(WEBAPP_DIR, '.integration-run');
const FIXTURE_PATH = path.join(OUT_DIR, 'fixture.json');
const SUMMARY_PATH = path.join(OUT_DIR, 'summary.json');
const ENTITIES_PATH = path.join(OUT_DIR, 'entities.json');
const MATRIX_RESULTS_PATH = path.join(WEBAPP_DIR, '..', '..', '..', 'qa-matrix-results.json');

const PROVISIONING_MODE = 'school-via-api-wizard-flag-via-api';

interface MatrixSummary {
	generatedAt?: string;
	base?: string;
	passed?: number;
	failed?: number;
	na?: number;
	total?: number;
	byModule?: Record<string, { ok: number; notOk: number; na: number }>;
	byActionType?: Record<string, number>;
	blockers?: BlockerReport[];
	results?: Array<{ module: string; statut: string }>;
}

function countByModule(results: MatrixSummary['results']): Record<string, { ok: number; notOk: number; na: number }> {
	const counts: Record<string, { ok: number; notOk: number; na: number }> = {};

	for (const row of results ?? []) {
		const bucket = counts[row.module] ?? { ok: 0, notOk: 0, na: 0 };
		if (row.statut === 'OK') bucket.ok += 1;
		else if (row.statut === 'N/A') bucket.na += 1;
		else bucket.notOk += 1;
		counts[row.module] = bucket;
	}

	return counts;
}

function shouldFail(matrix: MatrixSummary, failOn: string): boolean {
	if (failOn === 'auth_only') {
		const authResults = (matrix.results ?? []).filter(r => r.module === 'Auth');
		return authResults.some(r => r.statut === 'NOT OK');
	}

	return (matrix.failed ?? 0) > 0;
}

async function main(): Promise<void> {
	await mkdir(OUT_DIR, { recursive: true });

	console.log('=== Step 1: API provisioning (user + school + wizard flag) ===');
	const tenant = await provisionTenant();
	await writeFile(FIXTURE_PATH, JSON.stringify(tenant, null, 2));
	console.log(`Provisioned: ${tenant.email} / ${tenant.schoolName} (${tenant.schoolId})`);
	console.log(`Wizard flag: ${tenant.wizardCompleted ? 'set' : 'not confirmed'}`);

	const excludedModules = process.env['QA_MATRIX_EXCLUDE_MODULES'] ?? '';
	const env = {
		...process.env,
		QA_LOGIN_EMAIL: tenant.email,
		QA_LOGIN_PASSWORD: tenant.password,
		INTEGRATION_TARGET: 'production',
		INTEGRATION_PROVISIONED: '1',
		QA_MATRIX_EXCLUDE_MODULES: excludedModules,
	};

	console.log('\n=== Step 2-3: Web setup + Playwright qa-matrix ===');
	console.log(`Excluded from automated run: ${[...defaultExcludedModulesForRun(), ...excludedModules.split(',').map(m => m.trim()).filter(Boolean)].join(', ')}`);
	console.log(`Policy: ${INTEGRATION_POLICY}`);

	const matrixRun = spawnSync(
		'bun',
		['run', 'qa:matrix'],
		{
			cwd: WEBAPP_DIR,
			env,
			stdio: 'inherit',
			shell: true,
		},
	);

	let matrixSummary: MatrixSummary = {};
	try {
		const raw = await readFile(MATRIX_RESULTS_PATH, 'utf8');
		matrixSummary = JSON.parse(raw) as MatrixSummary;
	}
	catch {
		console.warn('Could not read qa-matrix-results.json');
	}

	const excludedList = excludedModules.split(',').map(m => m.trim()).filter(Boolean);
	const moduleCounts = matrixSummary.byModule ?? countByModule(matrixSummary.results);

	let setupSteps: unknown[] = [];
	let setupBlockers: BlockerReport[] = [];
	try {
		const raw = await readFile(ENTITIES_PATH, 'utf8');
		const parsed = JSON.parse(raw) as { steps?: Array<{ blocked?: boolean }> };
		setupSteps = parsed.steps ?? [];
		if (setupSteps.some(s => s && typeof s === 'object' && 'blocked' in s && (s as { blocked?: boolean }).blocked)) {
			const { studentSetupBlockerReport } = await import('../tests/integration/setup/setup-blockers');
			setupBlockers = [studentSetupBlockerReport()];
		}
	}
	catch {
		// setup file optional if matrix failed before setup
	}

	const blockers = [...setupBlockers, ...(matrixSummary.blockers ?? [])];

	const summary = {
		generatedAt: new Date().toISOString(),
		provisioningMode: PROVISIONING_MODE,
		setupPhase: 'ui-journey-then-unclaimed-matrix',
		policy: INTEGRATION_POLICY,
		apiCreates: ['user', 'school'],
		apiFlags: ['wizardCompleted'],
		excludedModules: excludedList,
		tenant: {
			email: tenant.email,
			schoolId: tenant.schoolId,
			schoolName: tenant.schoolName,
			subjectId: tenant.subjectId,
			apiUrl: tenant.apiUrl,
			wizardCompleted: tenant.wizardCompleted,
		},
		webSetup: { steps: setupSteps },
		matrix: {
			base: matrixSummary.base,
			passed: matrixSummary.passed ?? 0,
			failed: matrixSummary.failed ?? 0,
			na: matrixSummary.na ?? 0,
			total: matrixSummary.total ?? 0,
			byModule: moduleCounts,
			byActionType: matrixSummary.byActionType ?? {},
		},
		blockers,
	};

	await writeFile(SUMMARY_PATH, JSON.stringify(summary, null, 2));

	console.log('\n=== Step 4: Report ===');
	console.log(`Provisioned: ${tenant.email} / school ${tenant.schoolId}`);
	console.log(`Excluded modules: ${excludedList.join(', ')}`);
	for (const [module, counts] of Object.entries(moduleCounts)) {
		console.log(`${module}: ${counts.ok} OK, ${counts.na} N/A, ${counts.notOk} NOT OK`);
	}
	console.log(
		`Total: ${summary.matrix.passed} OK | ${summary.matrix.failed} NOT OK | ${summary.matrix.na} N/A`,
	);
	printBlockers(blockers);
	console.log(`Summary: ${SUMMARY_PATH}`);

	const failOn = process.env['INTEGRATION_FAIL_ON'] ?? 'not_ok';
	if (matrixRun.status !== 0 || shouldFail(matrixSummary, failOn)) {
		process.exit(1);
	}
}

main().catch((err) => {
	console.error('Integration run failed:', err instanceof Error ? err.message : err);
	process.exit(1);
});
