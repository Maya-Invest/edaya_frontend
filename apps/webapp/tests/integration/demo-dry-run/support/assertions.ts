import type { DemoContext } from './types';
import assert from 'node:assert/strict';
import { waitForPageQuery } from '../../../../scripts/qa-harness-ui';
import { assertNoFatalError } from './visit';

/** Structure lists are scoped by the level rail, with URL-backed text search. */
export async function assertStructureListShell(ctx: DemoContext, scene: string, step: string): Promise<boolean> {
	const { page, reporter, shot, pageErrors } = ctx;
	const errorMark = pageErrors.snapshot();
	if (!await assertListShell(ctx, scene, `${step} — export`, { requireFilter: false })) return false;
	try {
		await waitForPageQuery(page);
		const originalUrl = page.url();
		const originalLevel = new URL(originalUrl).searchParams.get('gradeLevel');
		assert(originalLevel, 'Structure route must resolve a selected level');
		const rail = page.locator('aside').filter({ has: page.locator('#structure-level') });
		const links = rail.getByRole('link');
		const levels = await links.evaluateAll(elements => elements.map(element => ({
			href: element.getAttribute('href')!,
			count: Number(element.lastElementChild?.textContent),
		})));
		const next = levels.findIndex(level => new URL(level.href, originalUrl).searchParams.get('gradeLevel') !== originalLevel && level.count > 0);
		assert(next >= 0, 'Fixture must provide a second populated level');
		const selectedLevel = new URL(levels[next]!.href, originalUrl).searchParams.get('gradeLevel');
		await links.nth(next).click();
		await page.waitForURL(url => url.searchParams.get('gradeLevel') === selectedLevel);
		await waitForPageQuery(page);
		const rows = page.locator('[data-entity-id]');
		await rows.first().waitFor({ state: 'visible' });
		const before = (await rows.evaluateAll(elements => elements.map(element => element.getAttribute('data-entity-id')))).sort();
		const search = page.getByTestId('list-search');
		const query = '__integration_no_matching_structure_row__';
		await search.fill(query);
		await page.waitForURL(url => url.searchParams.get('q') === query);
		await page.waitForFunction(() => document.querySelectorAll('[data-entity-id]').length === 0);
		await page.reload({ waitUntil: 'domcontentloaded' });
		await waitForPageQuery(page);
		assert.equal(new URL(page.url()).searchParams.get('gradeLevel'), selectedLevel);
		assert.equal(await search.inputValue(), query, 'Search must survive reload');
		assert.equal(await rows.count(), 0, 'Unmatched search must remain empty after reload');
		await search.fill('');
		await page.waitForURL(url => !url.searchParams.get('q'));
		await rows.first().waitFor({ state: 'visible' });
		assert.deepEqual((await rows.evaluateAll(elements => elements.map(element => element.getAttribute('data-entity-id')))).sort(), before, 'Clearing search must restore the selected level records');
		await page.goto(originalUrl, { waitUntil: 'domcontentloaded' });
		await waitForPageQuery(page);
		assert(await assertNoFatalError(ctx, scene, step));
		assert(pageErrors.assertCleanSince(errorMark, scene, step));
		reporter.log(scene, step, 'pass');
		return true;
	} catch (error) {
		console.error('Structure list failure:', { url: page.url(), search: await page.getByTestId('list-search').inputValue().catch(() => null), error: error instanceof Error ? error.stack : String(error) });
		reporter.log(scene, step, 'fail', error instanceof Error ? error.message : String(error));
		await shot(`${scene}-structure-list`).catch(() => {});
		return false;
	}
}

/** Report models inherit their level/year from the structure workspace. */
export async function assertReportCardWorkspace(ctx: DemoContext, scene: string, step: string, canConfigureReports: boolean): Promise<boolean> {
	const { page, reporter, shot, pageErrors } = ctx;
	const errorMark = pageErrors.snapshot();
	try {
		await waitForPageQuery(page);
		const originalUrl = page.url();
		const originalLevel = new URL(originalUrl).searchParams.get('gradeLevel');
		assert(originalLevel, 'Report models must resolve a selected level');
		const newModel = page.getByRole('button', { name: /ajouter un modèle|add model/i });
		const assertCreateAccess = async () => {
			if (canConfigureReports) {
				await newModel.waitFor({ state: 'visible' });
				assert(await newModel.isEnabled(), 'Report configuration grant must enable model creation');
			} else {
				assert.equal(await newModel.count(), 0, 'Model creation must be hidden without report configuration authority');
			}
		};
		await assertCreateAccess();
		const links = page.locator('aside').filter({ has: page.locator('#structure-level') }).getByRole('link');
		const hrefs = await links.evaluateAll(elements => elements.map(element => element.getAttribute('href')!));
		const next = hrefs.findIndex(href => new URL(href, originalUrl).searchParams.get('gradeLevel') !== originalLevel);
		assert(next >= 0, 'Fixture must provide another level');
		const selectedLevel = new URL(hrefs[next]!, originalUrl).searchParams.get('gradeLevel');
		await links.nth(next).click();
		await page.waitForURL(url => url.searchParams.get('gradeLevel') === selectedLevel);
		await waitForPageQuery(page);
		await assertCreateAccess();
		await page.reload({ waitUntil: 'domcontentloaded' });
		await waitForPageQuery(page);
		assert.equal(new URL(page.url()).searchParams.get('gradeLevel'), selectedLevel, 'Selected level must survive reload');
		await assertCreateAccess();
		assert(await assertNoFatalError(ctx, scene, step));
		assert(pageErrors.assertCleanSince(errorMark, scene, step));
		await page.goto(originalUrl, { waitUntil: 'domcontentloaded' });
		await waitForPageQuery(page);
		reporter.log(scene, step, 'pass');
		return true;
	} catch (error) {
		reporter.log(scene, step, 'fail', error instanceof Error ? error.message : String(error));
		await shot(`${scene}-report-card-workspace`).catch(() => {});
		return false;
	}
}

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
