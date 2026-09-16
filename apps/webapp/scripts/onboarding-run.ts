#!/usr/bin/env bun
/**
 * Login + onboarding integration pipeline (Playwright library, fail-the-process):
 *   1. Public gates (`/`, `/dashboard`, `/onboarding`) → `/login`
 *   2. Password login error + signup validation, then unlinked signup → wizard
 *   3. Invalid invite token page
 *   4. Wizard step UI (disabled Continue, skip staff, Create school enabled)
 *   5. Owner logout after school step → resume `/onboarding?step=2`
 *   6. Happy-path provision → dashboard
 *   7. Invited staff `/invite/{token}` signup → dashboard
 *   8. Provisioned owner password login → dashboard
 *
 * Prerequisites:
 *   - Identity at AUTH_URL (default http://localhost:9900)
 *   - School API at API_URL (default http://localhost:9999) — empty, not demo-ci
 *   - Webapp at WEBAPP_URL (default http://localhost:5173)
 *   - Playwright chromium (auto-installed into apps/webapp/.cache/ms-playwright)
 *
 * Canonical command: bun run test:integration:onboarding
 * Owner journey (not this suite): bun run test:integration:provisioned
 */
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
		console.log(`Login + onboarding suite OK — ${summary.scenes.length} scenes`);
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
