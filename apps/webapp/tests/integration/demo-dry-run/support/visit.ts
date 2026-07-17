import type { DemoContext, VisitOptions } from './types';

export async function assertNoFatalError(ctx: DemoContext, scene: string, step: string): Promise<boolean> {
	const alert = ctx.page.locator('[role="alert"]').filter({
		hasText: /something went wrong|une erreur est survenue/i,
	});
	if (await alert.isVisible({ timeout: 1_000 }).catch(() => false)) {
		ctx.reporter.log(scene, step, 'fail', 'Error state visible on page');
		return false;
	}
	return true;
}

async function waitForAppShell(ctx: DemoContext): Promise<void> {
	await ctx.page
		.waitForSelector('nav, aside, [data-testid="app-shell"]', { timeout: 20_000 })
		.catch(() => ctx.page.waitForSelector('main', { timeout: 20_000 }));
}

async function waitForPathStable(
	ctx: DemoContext,
	expectedPathPrefix: string,
	timeoutMs = 20_000,
): Promise<{ ok: boolean; path: string }> {
	const { page } = ctx;
	const deadline = Date.now() + timeoutMs;
	while (Date.now() < deadline) {
		const currentPath = new URL(page.url()).pathname;
		if (currentPath.startsWith(expectedPathPrefix)) {
			await page.waitForTimeout(500);
			const again = new URL(page.url()).pathname;
			if (again.startsWith(expectedPathPrefix)) {
				return { ok: true, path: again };
			}
		}
		await page.waitForTimeout(150);
	}
	return { ok: false, path: new URL(page.url()).pathname };
}

export async function visit(
	ctx: DemoContext,
	url: string,
	scene: string,
	step: string,
	options: VisitOptions = {},
): Promise<boolean> {
	const { expectText, selector, pathPrefix, retry = false } = options;
	const expectedPath = pathPrefix ?? new URL(url).pathname;
	const errorMark = ctx.pageErrors.snapshot();
	const { page, reporter, shot, pageErrors } = ctx;

	const attempt = async (): Promise<boolean | 'missing-selector'> => {
		try {
			const response = await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 45_000 });
			const status = response?.status() ?? 0;
			if (status >= 400) {
				reporter.log(scene, step, 'fail', `HTTP ${status}`);
				await shot(`${scene}-${step.replace(/\s+/g, '-')}-http`);
				return false;
			}
			await page.waitForLoadState('networkidle', { timeout: 15_000 }).catch(() => {});
			await page
				.locator('[role="status"][aria-live="polite"]')
				.waitFor({ state: 'hidden', timeout: 30_000 })
				.catch(() => {});
			await waitForAppShell(ctx);

			const navigation = await waitForPathStable(ctx, expectedPath);
			if (!navigation.ok) {
				reporter.log(scene, step, 'fail', `Redirected away — at ${navigation.path}, expected ${expectedPath}`);
				await shot(`${scene}-${step.replace(/\s+/g, '-')}-redirect`);
				return false;
			}

			if (selector) {
				const el = page.locator(selector).first();
				if (!(await el.isVisible({ timeout: 15_000 }).catch(() => false))) {
					return 'missing-selector';
				}
			}
			if (expectText) {
				const found = await page
					.getByText(expectText, { exact: false })
					.first()
					.isVisible({ timeout: 10_000 })
					.catch(() => false);
				if (!found) {
					reporter.log(scene, step, 'fail', `Expected text: ${expectText}`);
					await shot(`${scene}-${step.replace(/\s+/g, '-')}`);
					return false;
				}
			}
			if (!(await assertNoFatalError(ctx, scene, step))) {
				await shot(`${scene}-${step.replace(/\s+/g, '-')}-error`);
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
	};

	let result = await attempt();
	if (result === 'missing-selector') {
		if (retry) {
			await page.reload({ waitUntil: 'domcontentloaded' }).catch(() => {});
			result = await attempt();
		}
		if (result === 'missing-selector') {
			reporter.log(scene, step, 'fail', `Missing selector: ${selector}`);
			await shot(`${scene}-${step.replace(/\s+/g, '-')}`);
			return false;
		}
	}
	return result === true;
}

export async function visitOrSkip(
	ctx: DemoContext,
	url: string,
	scene: string,
	step: string,
	options: VisitOptions = {},
): Promise<boolean> {
	const ok = await visit(ctx, url, scene, step, options);
	if (!ok && options.skipOnFail) {
		const { reporter } = ctx;
		const last = reporter.results[reporter.results.length - 1];
		if (last?.scene === scene && last?.step === step && last?.status === 'fail') {
			reporter.results.pop();
			reporter.log(scene, step, 'skip', options.skipOnFail);
		}
		return false;
	}
	return ok;
}
