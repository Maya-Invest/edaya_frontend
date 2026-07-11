import type { DemoContext } from './types';
import { DRAWER_TAB_LABELS, type DrawerTabKey } from './constants';
import { drawerTabFromPathname } from './paths';

export function urlTabParam(ctx: DemoContext): string | null {
	return new URL(ctx.page.url()).searchParams.get('tab');
}

/** Active drawer tab from `?tab=` (legacy drawers) or the URL path segment (school drawers). */
export function urlTabSegment(ctx: DemoContext): string | null {
	return urlTabParam(ctx) ?? drawerTabFromPathname(new URL(ctx.page.url()).pathname);
}

export async function waitForUrlTab(
	ctx: DemoContext,
	expected: string | null,
	{ absent = false, timeoutMs = 12_000 } = {},
): Promise<boolean> {
	const deadline = Date.now() + timeoutMs;
	while (Date.now() < deadline) {
		const tab = urlTabSegment(ctx);
		if (absent ? tab === null : tab === expected) {
			return true;
		}
		await ctx.page.waitForTimeout(120);
	}
	return false;
}

export async function waitForDrawerAside(ctx: DemoContext, timeoutMs = 30_000) {
	const drawer = ctx.page.locator('aside.fixed.right-0');
	return drawer.waitFor({ state: 'visible', timeout: timeoutMs }).then(() => drawer).catch(() => null);
}

export async function waitForDrawerTabBar(ctx: DemoContext, timeoutMs = 30_000) {
	const drawer = await waitForDrawerAside(ctx, timeoutMs);
	if (!drawer) {
		return null;
	}
	await ctx.page
		.locator('[role="status"][aria-live="polite"]')
		.waitFor({ state: 'hidden', timeout: timeoutMs })
		.catch(() => {});
	const bar = ctx.page.getByTestId('drawer-tab-bar');
	if (await bar.waitFor({ state: 'visible', timeout: timeoutMs }).then(() => true).catch(() => false)) {
		return bar;
	}
	const fallback = drawer.locator('a.rounded-full, button.rounded-full').first();
	if (await fallback.isVisible({ timeout: 5_000 }).catch(() => false)) {
		return drawer;
	}
	return null;
}

export async function clickDrawerTab(ctx: DemoContext, tabKey: DrawerTabKey): Promise<boolean> {
	const label = DRAWER_TAB_LABELS[tabKey];
	if (!label) {
		throw new Error(`Unknown drawer tab key: ${tabKey}`);
	}
	if (!(await waitForDrawerTabBar(ctx))) {
		return false;
	}
	const testBar = ctx.page.getByTestId('drawer-tab-bar');
	const root = (await testBar.isVisible().catch(() => false))
		? testBar
		: ctx.page.locator('aside.fixed.right-0');
	const link = root.getByRole('link', { name: label });
	if (await link.isVisible({ timeout: 5_000 }).catch(() => false)) {
		await link.click();
		await ctx.page.waitForTimeout(350);
		return true;
	}
	const btn = root.getByRole('button', { name: label });
	if (await btn.isVisible({ timeout: 5_000 }).catch(() => false)) {
		await btn.click();
		await ctx.page.waitForTimeout(350);
		return true;
	}
	return false;
}

export async function closeDrawer(ctx: DemoContext): Promise<boolean> {
	const closeBtn = ctx.page
		.locator('aside.fixed.right-0 footer')
		.getByRole('button', { name: /close|fermer/i });
	if (await closeBtn.isVisible({ timeout: 5_000 }).catch(() => false)) {
		await closeBtn.click();
		await ctx.page.waitForTimeout(500);
		return true;
	}
	return false;
}
