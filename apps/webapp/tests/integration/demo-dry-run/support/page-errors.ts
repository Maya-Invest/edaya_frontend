import type { Page } from 'playwright';
import { IGNORED_BROWSER_ERROR } from './constants';
import type { DemoReporter } from './reporter';

function isIgnorableBrowserError(message: string): boolean {
	return IGNORED_BROWSER_ERROR.test(message);
}

export interface PageErrorTracker {
	snapshot: () => number;
	assertCleanSince: (mark: number, scene: string, step: string) => boolean;
}

export function setupPageErrorTracking(
	page: Page,
	reporter: DemoReporter,
	consoleErrors: string[],
): PageErrorTracker {
	const pageErrors: string[] = [];

	page.on('console', msg => {
		if (msg.type() === 'error') consoleErrors.push(msg.text());
	});
	page.on('pageerror', err => {
		const message = err.message;
		consoleErrors.push(message);
		if (!isIgnorableBrowserError(message)) pageErrors.push(message);
	});

	return {
		snapshot: () => pageErrors.length,
		assertCleanSince(mark, scene, step) {
			const fresh = [...new Set(pageErrors.slice(mark))];
			if (fresh.length === 0) return true;
			reporter.log(scene, step, 'fail', `Uncaught page error: ${fresh.slice(0, 2).join(' | ')}`);
			return false;
		},
	};
}
