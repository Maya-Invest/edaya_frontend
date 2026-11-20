import { runScenarios } from '../support/scenario-registry';
import { withArtifactScope } from '../support/scenario-artifacts';
import { bindBrowserScenarioContext, type BrowserScenarioContext } from '../support/browser-scenario';
import { captureIntegrationCheckpoint } from '../support/visual-artifacts';
import { assertViewSurface } from '../support/view-workflow';
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
    const scenes = [
      { id: 'demo.picker', run: async () => {
        const available = await runDemoAccountPicker(page, base);
        reporter.log('D0', '0.0 Demo account selection preserves OTP login', available ? 'pass' : 'skip', available ? undefined : 'Development-only picker');
      } },
      { id: 'demo.core', surface: '/configuration/permission-profiles', run: () => runCoreDemoScenes(ctx) },
      { id: 'demo.list-shell', surface: '/school/calendar', run: () => runListShellScenes(ctx) },
      { id: 'demo.guardian', surface: '/school/guardians', run: () => runGuardianDrawerScene(ctx) },
      { id: 'demo.finance', surface: '/finance/billing/[id]', run: () => runFinanceDrawerScene(ctx) },
      { id: 'demo.layouts', run: () => runCleanupLayouts(browser, base, outDir, reporter, consoleErrors) },
      { id: 'demo.permissions', run: () => runOwnerPermissionChecks(browser, base, reporter, consoleErrors) },
    ];
    const outcomes = await runScenarios<BrowserScenarioContext>(scenes.map(scene => ({ id: scene.id, feature: 'demo', fixtureRequirements: ['demoJourney'],
      dependsOn: ['demo.list-shell', 'demo.guardian', 'demo.finance'].includes(scene.id) ? ['demo.core'] : [],
      steps: [{ id: scene.id, run: async () => {
        const start = reporter.results.length;
        await withArtifactScope({ id: scene.id, expected: 'Demo walkthrough assertions', directory: outDir, page }, async () => {
        await scene.run();
        const unsuccessful = reporter.results.slice(start).filter(result => result.status !== 'pass');
        if (unsuccessful.length && scene.id !== 'demo.picker') {
          throw new Error(unsuccessful.map(result => `${result.scene}/${result.step}: ${result.detail ?? result.status}`).join('\n'));
        }
        });
      }, ...(scene.surface ? { checkpoint: { id: 'complete', title: scene.id, surface: scene.surface,
        ready: async (context: BrowserScenarioContext) => assertViewSurface(context.page, { path: scene.surface!, kind: 'page' }) } } : {}) }],
    })), { onCheckpoint: captureIntegrationCheckpoint, createContext: async (_definition, cleanup) => bindBrowserScenarioContext({ browser, base, outDir,
      fixtures: { demoJourney: ctx } }, page, cleanup) });
    for (const outcome of outcomes.filter(result => result.status !== 'passed')) {
      reporter.log('Scenario', outcome.id, 'fail', outcome.detail);
    }

	const summary = reporter.summarize(consoleErrors);
	await reporter.writeResults(outDir, summary);
	reporter.printSummary(summary);

	if (summary.failed === 0 && summary.skipped === 0 && summary.passed > 0) completeExecution();

	return summary;
  } finally { await context.close(); await browser.close(); }
}
