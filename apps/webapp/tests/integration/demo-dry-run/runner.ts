import { mkdir } from 'node:fs/promises';
import { chromium } from 'playwright';
import { assertStackReady } from './support/auth';
import { createDemoContext } from './support/context';
import { DEMO_DRY_RUN_OUT_DIR, DEMO_WEBAPP_BASE } from './support/paths';
import { DemoReporter } from './support/reporter';
import type { DemoSummary } from './support/types';
import { runCoreDemoScenes } from './scenes/core-demo';
import { runDrawerTabChecks } from './scenes/drawer-tabs';
import { runFinanceDrawerScene } from './scenes/finance-drawer';
import { runGuardianDrawerScene } from './scenes/guardian-drawer';
import { runHomeroomNudgeCheck } from './scenes/homeroom';
import { runImportScene } from './scenes/import';
import { runListShellScenes } from './scenes/list-shell';
import { runModalUrlChecks } from './scenes/modal-url';
import { runOwnerPermissionChecks } from './scenes/owner-permissions';
import { runRouteCoverageScenes } from './scenes/route-coverage';
import { runToolsModalsScene } from './scenes/tools-modals';

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

	const reporter = new DemoReporter();
	const consoleErrors: string[] = [];
	const browser = await chromium.launch({ headless });
	const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
	const page = await context.newPage();
	const ctx = createDemoContext(page, base, outDir, reporter, consoleErrors);

	try {
		await runCoreDemoScenes(ctx);
		await runRouteCoverageScenes(ctx);
		await runListShellScenes(ctx);
		await runDrawerTabChecks(ctx);
		await runModalUrlChecks(ctx);
		await runImportScene(ctx);
		await runToolsModalsScene(ctx);
		await runGuardianDrawerScene(ctx);
		await runFinanceDrawerScene(ctx);
	}
	finally {
		await context.close();
	}

	await runHomeroomNudgeCheck(browser, base, reporter, consoleErrors);
	await runOwnerPermissionChecks(browser, base, reporter, consoleErrors);

	const summary = reporter.summarize(consoleErrors);
	await reporter.writeResults(outDir, summary);
	reporter.printSummary(summary);
	await browser.close();

	return summary;
}
