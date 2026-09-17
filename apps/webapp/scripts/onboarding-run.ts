#!/usr/bin/env bun
/**
 * Login + onboarding integration pipeline (Playwright library, fail-the-process):
 *   1. Public gates (`/`, `/dashboard`, `/onboarding`) → `/login`
 *   2. Password login error + signup validation; valid signup must show verification UI (not jump to the wizard)
 *   3. API-unavailable banner when Identity or school API probes fail
 *   4. Captured-link verification in a second tab leaves the original tab on the inbox copy
 *   5. Invalid, expired, and revoked invite tokens stay on `/invite/{token}`
 *   6. Wizard step UI (disabled Continue, invalid staff email, skip staff, Create school enabled, chapters drawer)
 *   7. Trimester/semester auto dates plus add/remove period
 *   8. Owner resume: reload + second tab stay on step 2; after provision, reload stays on step 4 with Back/stepper locked
 *   9. Double Create school submit reuses the provision identity and stays on the committed hold
 *  10. Provision commit with bootstrap failure shows Retry opening workspace, then recovers
 *  11. Happy-path provision with a valid wizard staff invite → dashboard
 *  12. Invited staff `/invite/{token}` new-account signup + verification (new tab) → dashboard, then password relogin
 *  13. Existing-account staff invite: captured-link signup, sign out, then sign in on `/invite/{token}` → dashboard
 *  14. Owner session opens a different staff invite → blocked / not consumed
 *  15. Revisit consumed token → already-accepted heading, not dashboard
 *  16. Invited teacher → teacher-linked / teacher portal gate (not `/dashboard`)
 *  17. Invited guardian → guardian-linked / guardian portal gate (not `/dashboard`)
 *  18. Provisioned owner password login → dashboard
 *
 * Canonical lane: REQUIRE_EMAIL_VERIFICATION=true and captured verification URLs only.
 * Seed `mark-email-verified` is not used here.
 *
 * Identity must run like staging:
 *   REQUIRE_EMAIL_VERIFICATION=true
 *   AUTH_DEV_OTP_PEEK=true (or AUTH_EMAIL_LOG_OTP=true) so GET /auth/edaya/dev/last-verification-url works
 * CI overlays those flags in `.github/scripts/ci-start-local-apis.sh`. Local `.env.example` defaults
 * REQUIRE_EMAIL_VERIFICATION=false — set it true before this suite or signup will fail the process.
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
