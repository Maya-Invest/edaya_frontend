import { mkdir } from 'node:fs/promises';
import { ensurePlaywrightChromium } from '../../../scripts/playwright-browsers';
import { assertStackReady } from './support/auth';
import { createDemoContext } from './support/context';
import { DEMO_DRY_RUN_OUT_DIR, DEMO_WEBAPP_BASE } from './support/paths';
import { beginExecution } from '../support/execution-metadata';
import { DemoReporter } from './support/reporter';
import type { DemoSummary } from './support/types';
import { runCleanupLayouts } from './scenes/cleanup-layouts';
import { runCoreDemoScenes } from './scenes/core-demo';
import { runDemoAccountPicker } from './scenes/demo-account-picker';
import { runFinanceDrawerScene } from './scenes/finance-drawer';
import { runGuardianDrawerScene } from './scenes/guardian-drawer';
import { runListShellScenes } from './scenes/list-shell';
import { runOwnerPermissionChecks } from './scenes/owner-permissions';
// /configuration/tools — manual QA only (see qa-matrix-exclusions.ts)
// import { runImportScene } from './scenes/import';
// import { runToolsModalsScene } from './scenes/tools-modals';

export interface RunDemoDryRunOptions {
	base?: string;
	outDir?: string;
	headless?: boolean;
}

export async function runDemoDryRun(options: RunDemoDryRunOptions = {}): Promise<DemoSummary> {
	const base = options.base ?? DEMO_WEBAPP_BASE;
	const outDir = options.outDir ?? DEMO_DRY_RUN_OUT_DIR;
	const headless = options.headless ?? true;

	await assertStackReady(base);
	await mkdir(outDir, { recursive: true });
	const completeExecution = beginExecution(outDir);
	ensurePlaywrightChromium();
	const { chromium } = await import('playwright');

	const reporter = new DemoReporter();
	const consoleErrors: string[] = [];
	const browser = await chromium.launch({ headless });
	const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
	const page = await context.newPage();
	const ctx = createDemoContext(page, base, outDir, reporter, consoleErrors);

	try {
		try {
			const available = await runDemoAccountPicker(page, base);
			reporter.log('D0', '0.0 Demo account selection preserves OTP login', available ? 'pass' : 'skip', available ? undefined : 'Development-only picker');
		}
		catch (error) {
			reporter.log('D0', '0.0 Demo account selection preserves OTP login', 'fail', error instanceof Error ? error.message : String(error));
			throw error;
		}
		await runCoreDemoScenes(ctx);
		await runListShellScenes(ctx);
		await runGuardianDrawerScene(ctx);
		await runFinanceDrawerScene(ctx);
	}
	finally {
		await context.close();
	}

	await runCleanupLayouts(browser, base, outDir, reporter, consoleErrors);
	await runOwnerPermissionChecks(browser, base, reporter, consoleErrors);

	const summary = reporter.summarize(consoleErrors);
	await reporter.writeResults(outDir, summary);
	reporter.printSummary(summary);
	await browser.close();
	if (summary.failed === 0 && summary.skipped === 0 && summary.passed > 0) completeExecution();

	return summary;
}
