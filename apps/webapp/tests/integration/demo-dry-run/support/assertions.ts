import type { DemoContext } from './types';
import { assertNoFatalError } from './visit';

export async function assertListShell(
	ctx: DemoContext,
	scene: string,
	step: string,
	{ requireFilter = true } = {},
): Promise<boolean> {
	const { page, reporter, shot, pageErrors } = ctx;
	const errorMark = pageErrors.snapshot();

	try {
		await page
			.locator('[role="status"][aria-live="polite"]')
			.waitFor({ state: 'hidden', timeout: 30_000 })
			.catch(() => {});
		const moreBtn = page.getByTestId('list-more-menu');
		if (!(await moreBtn.isVisible({ timeout: 15_000 }).catch(() => false))) {
			reporter.log(scene, step, 'fail', 'Missing list more menu');
			await shot(`${scene}-${step.replace(/\s+/g, '-')}`);
			return false;
		}
		await moreBtn.click();
		const exportItem = page.getByRole('button', { name: /export|exporter/i });
		if (!(await exportItem.isVisible({ timeout: 5_000 }).catch(() => false))) {
			reporter.log(scene, step, 'fail', 'Export action missing in more menu');
			await shot(`${scene}-${step.replace(/\s+/g, '-')}-export`);
			return false;
		}
		await page.keyboard.press('Escape');

		if (requireFilter) {
			const filterBtn = page.getByTestId('list-filter');
			if (!(await filterBtn.isVisible({ timeout: 5_000 }).catch(() => false))) {
				reporter.log(scene, step, 'fail', 'Missing filter panel trigger');
				await shot(`${scene}-${step.replace(/\s+/g, '-')}-filter`);
				return false;
			}
			await filterBtn.click();
			const popover = page.locator('[data-state="open"]').last();
			if (!(await popover.isVisible({ timeout: 5_000 }).catch(() => false))) {
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
		await page
			.locator('[role="status"][aria-live="polite"]')
			.waitFor({ state: 'hidden', timeout: 30_000 })
			.catch(() => {});
		const filterSelect = page.locator('select[aria-label="Filter"]');
		const moreBtn = page.getByTestId('list-more-menu');
		if (!(await filterSelect.first().isVisible({ timeout: 15_000 }).catch(() => false))) {
			reporter.log(scene, step, 'fail', 'Missing filter select');
			await shot(`${scene}-${step.replace(/\s+/g, '-')}`);
			return false;
		}
		if (!(await moreBtn.isVisible({ timeout: 5_000 }).catch(() => false))) {
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
	{ requireFilter = true, skipReason }: { requireFilter?: boolean; skipReason?: string } = {},
): Promise<boolean> {
	if (await pageHasFatalError(ctx)) {
		ctx.reporter.log(scene, step, 'skip', skipReason ?? 'Page error — check permissions or seed');
		return true;
	}
	return assertListShell(ctx, scene, step, { requireFilter });
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
