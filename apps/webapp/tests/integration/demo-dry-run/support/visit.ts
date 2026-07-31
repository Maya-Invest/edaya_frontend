import type { DemoContext, VisitOptions } from './types';

const LOADING_HIDDEN_TIMEOUT_MS = 30_000;
const PATH_STABLE_PAUSE_MS = 200;

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
		.waitForSelector('aside#app-sidebar, nav, aside, [data-testid="app-shell"]', { timeout: 20_000 })
		.catch(() => ctx.page.waitForSelector('main', { timeout: 20_000 }));
}

async function waitForLoadingHidden(ctx: DemoContext): Promise<void> {
	const loading = ctx.page.locator('[role="status"][aria-live="polite"]');
	await ctx.page.waitForTimeout(50);
	await loading.waitFor({ state: 'visible', timeout: 3_000 }).catch(() => {});
	await loading.waitFor({ state: 'hidden', timeout: LOADING_HIDDEN_TIMEOUT_MS }).catch(() => {});
	await ctx.page.waitForTimeout(PATH_STABLE_PAUSE_MS);
}

async function describePageBlocker(ctx: DemoContext): Promise<string | undefined> {
	const loading = ctx.page.locator('[role="status"][aria-live="polite"]');
	if (await loading.isVisible({ timeout: 200 }).catch(() => false)) {
		return 'PageQuery still loading';
	}
	const errorAlert = ctx.page.locator('[role="alert"]').filter({
		hasText: /something went wrong|une erreur est survenue|unable to load/i,
	});
	if (await errorAlert.isVisible({ timeout: 200 }).catch(() => false)) {
		const text = (await errorAlert.innerText().catch(() => '')).trim();
		return text ? `Error state: ${text.slice(0, 120)}` : 'Error state visible';
	}
	return undefined;
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
			await page.waitForTimeout(PATH_STABLE_PAUSE_MS);
			const again = new URL(page.url()).pathname;
			if (again.startsWith(expectedPathPrefix)) {
				return { ok: true, path: again };
			}
		}
		await page.waitForTimeout(100);
	}
	return { ok: false, path: new URL(page.url()).pathname };
}

function isAlreadyOnTarget(page: DemoContext['page'], url: string): boolean {
	const target = new URL(url);
	const current = new URL(page.url());
	return current.pathname === target.pathname && current.search === target.search;
}

async function verifyVisitExpectations(
	ctx: DemoContext,
	scene: string,
	step: string,
	expectedPath: string,
	options: VisitOptions,
	errorMark: number,
): Promise<boolean | 'missing-selector'> {
	const { expectText, selector } = options;
	const selectorTimeoutMs = options.selectorTimeoutMs ?? 15_000;
	const { page, reporter, shot, pageErrors } = ctx;

	await waitForLoadingHidden(ctx);
	await waitForAppShell(ctx);

	const navigation = await waitForPathStable(ctx, expectedPath);
	if (!navigation.ok) {
		reporter.log(scene, step, 'fail', `Redirected away — at ${navigation.path}, expected ${expectedPath}`);
		await shot(`${scene}-${step.replace(/\s+/g, '-')}-redirect`);
		return false;
	}

	if (selector) {
		const el = page.locator(selector).first();
		if (!(await el.isVisible({ timeout: selectorTimeoutMs }).catch(() => false))) {
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

export async function visit(
	ctx: DemoContext,
	url: string,
	scene: string,
	step: string,
	options: VisitOptions = {},
): Promise<boolean> {
	const { selector, retry = false } = options;
	const expectedPath = options.pathPrefix ?? new URL(url).pathname;
	const errorMark = ctx.pageErrors.snapshot();
	const { page, reporter, shot } = ctx;

	const attempt = async (skipGoto: boolean): Promise<boolean | 'missing-selector'> => {
		try {
			if (!skipGoto) {
				const response = await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 45_000 });
				const status = response?.status() ?? 0;
				if (status >= 400) {
					reporter.log(scene, step, 'fail', `HTTP ${status}`);
					await shot(`${scene}-${step.replace(/\s+/g, '-')}-http`);
					return false;
				}
			}

			return await verifyVisitExpectations(ctx, scene, step, expectedPath, options, errorMark);
		}
		catch (err) {
			reporter.log(scene, step, 'fail', err instanceof Error ? err.message : String(err));
			await shot(`${scene}-${step.replace(/\s+/g, '-')}-exception`).catch(() => {});
			return false;
		}
	};

	const skipGoto = isAlreadyOnTarget(page, url);
	let result = await attempt(skipGoto);
	if (result === 'missing-selector') {
		if (retry) {
			await page.reload({ waitUntil: 'domcontentloaded' }).catch(() => {});
			result = await attempt(false);
		}
		if (result === 'missing-selector') {
			const blocker = await describePageBlocker(ctx);
			const detail = blocker ? ` — ${blocker}` : '';
			reporter.log(scene, step, 'fail', `Missing selector: ${selector}${detail}`);
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
