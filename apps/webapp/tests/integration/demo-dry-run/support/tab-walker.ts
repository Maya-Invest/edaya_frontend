import type { DrawerTabKey } from './constants';
import type { DrawerTabRouteCase } from './tab-matrix';
import type { DemoContext } from './types';
import {
	clickDrawerTab,
	closeDrawer,
	urlTabSegment,
	waitForDrawerTabLinks,
	waitForUrlTab,
} from './drawer';
import { visit } from './visit';

function stepSlug(value: string): string {
	return value.replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '').toLowerCase();
}

/** Deep-link first tab; click through remaining tabs (avoids full reload per tab). */
export async function walkDrawerTabRoute(
	ctx: DemoContext,
	scene: string,
	routeCase: DrawerTabRouteCase,
): Promise<boolean> {
	const { base, reporter, shot } = ctx;
	let routeOk = true;
	const slug = stepSlug(routeCase.name);
	const tabs = routeCase.tabs;
	if (tabs.length === 0) {
		return true;
	}

	const firstTab = tabs[0]!;
	const firstPath = routeCase.pathForTab(firstTab);
	const firstUrl = `${base}${firstPath}`;
	const firstPathPrefix = firstPath.split('?')[0]!;

	const opened = await visit(ctx, firstUrl, scene, `${slug} deep-link ${firstTab}`, {
		pathPrefix: firstPathPrefix,
	});
	if (!opened) {
		if (routeCase.skipReason) {
			reporter.log(scene, `${slug} deep-link ${firstTab}`, 'skip', routeCase.skipReason);
			return false;
		}
		return false;
	}

	if (!(await waitForDrawerTabLinks(ctx))) {
		reporter.log(scene, `${slug} tab bar on ${firstTab}`, 'fail', 'Drawer tab bar not visible');
		await shot(`${scene}-${slug}-tab-bar-${firstTab}`);
		return false;
	}

	if (await waitForUrlTab(ctx, firstTab)) {
		reporter.log(scene, `${slug} URL segment ${firstTab}`, 'pass');
	}
	else {
		reporter.log(
			scene,
			`${slug} URL segment ${firstTab}`,
			routeCase.skipReason ? 'skip' : 'fail',
			`tab=${urlTabSegment(ctx) ?? 'none'}`,
		);
		if (!routeCase.skipReason) {
			await shot(`${scene}-${slug}-url-${firstTab}`);
			routeOk = false;
		}
	}

	for (const tab of tabs.slice(1)) {
		if (!(await waitForDrawerTabLinks(ctx))) {
			reporter.log(scene, `${slug} tab bar on ${tab}`, 'fail', 'Drawer tab bar not visible');
			await shot(`${scene}-${slug}-tab-bar-${tab}`);
			routeOk = false;
			continue;
		}

		const tabKey = tab as DrawerTabKey;
		const clicked = await clickDrawerTab(ctx, tabKey);
		if (!clicked) {
			const pathWithQuery = routeCase.pathForTab(tab);
			const pathPrefix = pathWithQuery.split('?')[0]!;
			const deepLinked = await visit(ctx, `${base}${pathWithQuery}`, scene, `${slug} deep-link ${tab}`, {
				pathPrefix,
			});
			if (!deepLinked) {
				reporter.log(scene, `${slug} click ${tab}`, 'fail', 'Tab button not found');
				routeOk = false;
				continue;
			}
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

	const lastTab = tabs[tabs.length - 1]!;
	if (firstTab !== lastTab && tabs.length > 1 && await waitForDrawerTabLinks(ctx)) {
		if (await clickDrawerTab(ctx, firstTab as DrawerTabKey) && await waitForUrlTab(ctx, firstTab)) {
			reporter.log(scene, `${slug} click to ${firstTab}`, 'pass');
		}
		else {
			reporter.log(scene, `${slug} click to ${firstTab}`, 'fail', `tab=${urlTabSegment(ctx) ?? 'none'}`);
			routeOk = false;
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
