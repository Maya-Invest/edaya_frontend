#!/usr/bin/env bun
/**
 * Real passwordless login, invitation, and school-provisioning journeys.
 * Scenario IDs and dependencies live in onboarding/scenarios.ts.
 * Run against disposable local Identity and school services with captured OTP delivery.
 * The summary records every passed, failed, and blocked scenario; any failure exits nonzero.
 */
import { beginExecution } from '../tests/integration/support/execution-metadata';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { runOnboardingSuite } from '../tests/integration/onboarding/runner';
import { ensurePlaywrightChromium } from './playwright-browsers';

const WEBAPP_DIR = path.join(import.meta.dirname, '..');
const OUT_DIR = path.join(WEBAPP_DIR, '.onboarding-run');
const SUMMARY_PATH = path.join(OUT_DIR, 'summary.json');
const WEBAPP_BASE = process.env.WEBAPP_URL ?? 'http://localhost:5173';

async function main(): Promise<void> {
	await mkdir(OUT_DIR, { recursive: true });
	const completeExecution = beginExecution(OUT_DIR);
	ensurePlaywrightChromium();
	const { chromium } = await import('playwright');

	const browser = await chromium.launch({
		headless: process.env.HEADED !== '1',
	});

	try {
		const summary = await runOnboardingSuite({
			browser,
			base: WEBAPP_BASE,
			outDir: OUT_DIR,
		});
		await writeFile(SUMMARY_PATH, JSON.stringify(summary, null, 2));
		try { completeExecution(); }
		catch (error) {
			await writeFile(SUMMARY_PATH, JSON.stringify({ ...summary, ok: false, executionError: String(error) }, null, 2));
			console.error('Onboarding results rejected:', String(error));
			process.exitCode = 1;
			return;
		}
		if (!summary.ok) process.exitCode = 1;
		console.log(`Login + onboarding suite ${summary.ok ? 'OK' : 'FAILED'} — ${summary.scenes.length} scenes`);
		if (summary.catalog) {
			console.log(
				`Catalog: unique=${summary.catalog.unique} automated=${summary.catalog.automated} N/A=${summary.catalog.na} excluded=${summary.catalog.excluded} manual=${summary.catalog.manual}`,
			);
		}
		console.log(`Summary: ${SUMMARY_PATH}`);
	}
	catch (error) {
		const message = error instanceof Error ? error.message : String(error);
		await writeFile(SUMMARY_PATH, JSON.stringify({
			generatedAt: new Date().toISOString(),
			ok: false,
			error: message,
		}, null, 2));
		console.error('Onboarding integration failed:', message);
		process.exitCode = 1;
	}
	finally {
		await browser.close();
	}
}

main().catch((err) => {
	console.error('Onboarding run failed:', err instanceof Error ? err.message : err);
	process.exit(1);
});
