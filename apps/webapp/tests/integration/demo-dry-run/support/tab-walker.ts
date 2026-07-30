import {
	clickDrawerTab,
	closeDrawer,
	urlTabSegment,
	waitForDrawerTabBar,
	waitForUrlTab,
} from './drawer';
import type { DrawerTabKey } from './constants';
import type { DrawerTabRouteCase } from './tab-matrix';
import type { DemoContext } from './types';
import { visit } from './visit';

function stepSlug(value: string): string {
	return value.replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '').toLowerCase();
}

export async function walkDrawerTabRoute(
	ctx: DemoContext,
	scene: string,
	routeCase: DrawerTabRouteCase,
): Promise<boolean> {
	const { base, reporter, shot } = ctx;
	let routeOk = true;
	const slug = stepSlug(routeCase.name);

	for (const tab of routeCase.tabs) {
		const pathWithQuery = routeCase.pathForTab(tab);
		const url = `${base}${pathWithQuery}`;
		const pathPrefix = pathWithQuery.split('?')[0]!;
		const step = `${slug} deep-link ${tab}`;
		const visited = await visit(ctx, url, scene, step, {
			pathPrefix,
		});
		if (!visited) {
			if (routeCase.skipReason) {
				reporter.log(scene, step, 'skip', routeCase.skipReason);
				return false;
			}
			routeOk = false;
			continue;
		}

		if (!(await waitForDrawerTabBar(ctx))) {
			reporter.log(scene, `${slug} tab bar on ${tab}`, 'fail', 'Drawer tab bar not visible');
			await shot(`${scene}-${slug}-tab-bar-${tab}`);
			routeOk = false;
			continue;
		}

		if (await waitForUrlTab(ctx, tab)) {
			reporter.log(scene, `${slug} URL segment ${tab}`, 'pass');
		}
		else {
			reporter.log(
				scene,
				`${slug} URL segment ${tab}`,
				routeCase.skipReason ? 'skip' : 'fail',
				`tab=${urlTabSegment(ctx) ?? 'none'}`,
			);
			if (!routeCase.skipReason) {
				await shot(`${scene}-${slug}-url-${tab}`);
				routeOk = false;
			}
		}
	}

	const firstTab = routeCase.tabs[0];
	const lastTab = routeCase.tabs[routeCase.tabs.length - 1];
	if (firstTab && lastTab && firstTab !== lastTab) {
		const reopenPath = routeCase.pathForTab(lastTab);
		const reopenUrl = `${base}${reopenPath}`;
		if (await visit(ctx, reopenUrl, scene, `${slug} click navigation setup`, {
			pathPrefix: reopenPath.split('?')[0],
		}) && await waitForDrawerTabBar(ctx)) {
			if (await clickDrawerTab(ctx, firstTab as DrawerTabKey) && await waitForUrlTab(ctx, firstTab)) {
				reporter.log(scene, `${slug} click to ${firstTab}`, 'pass');
			}
			else {
				reporter.log(scene, `${slug} click to ${firstTab}`, 'fail', `tab=${urlTabSegment(ctx) ?? 'none'}`);
				routeOk = false;
			}
		}
	}

	return routeOk;
}

export async function assertDrawerCloseReturnsToList(
	ctx: DemoContext,
	scene: string,
	routeCase: DrawerTabRouteCase,
	listPath: string,
): Promise<void> {
	const { base, reporter, shot } = ctx;
	const slug = stepSlug(routeCase.name);
	const tab = routeCase.tabs[routeCase.tabs.length - 1] ?? 'profile';
	const url = `${base}${routeCase.pathForTab(tab)}`;

	if (!(await visit(ctx, url, scene, `${slug} reopen for close test`, {
		pathPrefix: routeCase.drawerPathPrefix,
	}))) {
		return;
	}

	if (await closeDrawer(ctx)) {
		const currentPath = new URL(ctx.page.url()).pathname;
		const tabAfterClose = urlTabSegment(ctx);
		if (currentPath === listPath && tabAfterClose === null) {
			reporter.log(scene, `${slug} close returns to list`, 'pass');
		}
		else {
			reporter.log(
				scene,
				`${slug} close returns to list`,
				'fail',
				`path=${currentPath} tab=${tabAfterClose ?? 'none'}`,
			);
			await shot(`${scene}-${slug}-close`);
		}
	}
	else {
		reporter.log(scene, `${slug} close returns to list`, 'fail', 'Close button not found');
	}
}
