import type { Page } from 'playwright';
import { createShot } from './auth';
import { setupPageErrorTracking } from './page-errors';
import type { DemoReporter } from './reporter';
import type { DemoContext } from './types';

export function createDemoContext(
	page: Page,
	base: string,
	outDir: string,
	reporter: DemoReporter,
	consoleErrors: string[],
): DemoContext {
	const pageErrors = setupPageErrorTracking(page, reporter, consoleErrors);
	return {
		base,
		page,
		reporter,
		pageErrors,
		outDir,
		shot: createShot(page, outDir),
	};
}
