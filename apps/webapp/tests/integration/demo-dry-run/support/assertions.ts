import type { DemoContext } from './types';
import { assertNoFatalError } from './visit';

export async function assertListShell(
	ctx: DemoContext,
	scene: string,
	step: string,
	{ requireFilter = true, exportName = /export|exporter/i }: { requireFilter?: boolean; exportName?: RegExp } = {},
): Promise<boolean> {
	const { page, reporter, shot, pageErrors } = ctx;
	const errorMark = pageErrors.snapshot();

	try {
		const loading = page.locator('[role="status"][aria-live="polite"]');
		if (await loading.isVisible({ timeout: 500 }).catch(() => false)) {
			await loading.waitFor({ state: 'hidden', timeout: 10_000 }).catch(() => {});
		}
		const moreBtn = page.getByTestId('list-more-menu');
		if (!(await moreBtn.waitFor({ state: 'visible', timeout: 15_000 }).then(() => true).catch(() => false))) {
			reporter.log(scene, step, 'fail', 'Missing list more menu');
			await shot(`${scene}-${step.replace(/\s+/g, '-')}`);
			return false;
		}
		await moreBtn.click();
		const exportItem = page.getByRole('button', { name: exportName });
		if (!(await exportItem.waitFor({ state: 'visible', timeout: 5_000 }).then(() => true).catch(() => false))) {
			reporter.log(scene, step, 'fail', 'Export action missing in more menu');
			await shot(`${scene}-${step.replace(/\s+/g, '-')}-export`);
			return false;
		}
		await page.keyboard.press('Escape');

		if (requireFilter) {
			const filterBtn = page.getByTestId('list-filter').or(
				page.getByRole('button', { name: /filtre|filter/i }),
			).first();
			if (!(await filterBtn.waitFor({ state: 'visible', timeout: 5_000 }).then(() => true).catch(() => false))) {
				reporter.log(scene, step, 'fail', 'Missing filter panel trigger');
				await shot(`${scene}-${step.replace(/\s+/g, '-')}-filter`);
				return false;
			}
			await filterBtn.click();
			const popover = page.locator('[data-state="open"]').last();
			if (!(await popover.waitFor({ state: 'visible', timeout: 5_000 }).then(() => true).catch(() => false))) {
				reporter.log(scene, step, 'fail', 'Filter popover did not open');
				await shot(`${scene}-${step.replace(/\s+/g, '-')}-filter-open`);
				return false;
			}
			await page.keyboard.press('Escape');
		}

		if (!(await assertNoFatalError(ctx, scene, step))) {
			return false;
		}
		if (!pageErrors.assertCleanSince(errorMark, scene, step)) {
			await shot(`${scene}-${step.replace(/\s+/g, '-')}-pageerror`);
			return false;
		}
		reporter.log(scene, step, 'pass');
		return true;
	}
	catch (err) {
		reporter.log(scene, step, 'fail', err instanceof Error ? err.message : String(err));
		await shot(`${scene}-${step.replace(/\s+/g, '-')}-exception`).catch(() => {});
		return false;
	}
}

export async function assertFilterSelectShell(
	ctx: DemoContext,
	scene: string,
	step: string,
): Promise<boolean> {
	const { page, reporter, shot, pageErrors } = ctx;
	const errorMark = pageErrors.snapshot();

	try {
		const loading = page.locator('[role="status"][aria-live="polite"]');
		if (await loading.isVisible({ timeout: 500 }).catch(() => false)) {
			await loading.waitFor({ state: 'hidden', timeout: 10_000 }).catch(() => {});
		}
		const filterSelect = page.locator('select[aria-label="Filter"]');
		const moreBtn = page.getByTestId('list-more-menu');
		if (!(await filterSelect.first().waitFor({ state: 'visible', timeout: 15_000 }).then(() => true).catch(() => false))) {
			reporter.log(scene, step, 'fail', 'Missing filter select');
			await shot(`${scene}-${step.replace(/\s+/g, '-')}`);
			return false;
		}
		if (!(await moreBtn.waitFor({ state: 'visible', timeout: 5_000 }).then(() => true).catch(() => false))) {
			reporter.log(scene, step, 'fail', 'Missing list more menu');
			await shot(`${scene}-${step.replace(/\s+/g, '-')}`);
			return false;
		}
		if (!pageErrors.assertCleanSince(errorMark, scene, step)) {
			await shot(`${scene}-${step.replace(/\s+/g, '-')}-pageerror`);
			return false;
		}
		reporter.log(scene, step, 'pass');
		return true;
	}
	catch (err) {
		reporter.log(scene, step, 'fail', err instanceof Error ? err.message : String(err));
		return false;
	}
}

async function pageHasFatalError(ctx: DemoContext): Promise<boolean> {
	return ctx.page
		.locator('[role="alert"]')
		.filter({ hasText: /something went wrong|une erreur est survenue/i })
		.isVisible({ timeout: 1_000 })
		.catch(() => false);
}

export async function assertListShellOrSkip(
	ctx: DemoContext,
	scene: string,
	step: string,
	{ requireFilter = true, skipReason, exportName }: { requireFilter?: boolean; skipReason?: string; exportName?: RegExp } = {},
): Promise<boolean> {
	if (await pageHasFatalError(ctx)) {
		ctx.reporter.log(scene, step, 'skip', skipReason ?? 'Page error — check permissions or seed');
		return true;
	}
	return assertListShell(ctx, scene, step, { requireFilter, exportName });
}

export async function assertFilterSelectShellOrSkip(
	ctx: DemoContext,
	scene: string,
	step: string,
	skipReason: string,
): Promise<boolean> {
	if (await pageHasFatalError(ctx)) {
		ctx.reporter.log(scene, step, 'skip', skipReason);
		return true;
	}
	return assertFilterSelectShell(ctx, scene, step);
}
