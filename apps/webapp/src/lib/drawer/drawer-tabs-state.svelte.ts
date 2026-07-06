import { readDrawerTab, writeDrawerTab } from '$lib/drawer/drawer-tab-url';
import { listHref } from '$lib/list/list-filters-state.svelte';
import { appGoto } from '$lib/navigation/app-navigation';

export interface DrawerTabsSyncConfig<T extends string> {
	allowed: () => readonly T[];
	defaultTab: T;
	getUrl: () => URL;
	goto: (href: string) => void;
}

export class DrawerTabsState<T extends string> {
	tab = $state<T>('' as T);
	ready = $state(false);

	constructor(private readonly config: DrawerTabsSyncConfig<T>) {
		this.tab = config.defaultTab;
	}

	hydrate() {
		const next = readDrawerTab(
			this.config.getUrl(),
			this.config.allowed(),
			this.config.defaultTab,
		);
		if (!this.ready || this.tab !== next) {
			this.tab = next;
			this.ready = true;
		}
	}

	select(next: T) {
		if (!this.config.allowed().includes(next)) {
			return;
		}
		this.tab = next;
		const currentUrl = this.config.getUrl();
		const href = writeDrawerTab(currentUrl, next, this.config.defaultTab);
		if (href === listHref(currentUrl)) {
			return;
		}
		this.config.goto(href);
	}
}

export function createUrlSyncedDrawerTabs<T extends string>(config: {
	allowed: readonly T[] | (() => readonly T[]);
	defaultTab: T;
	getUrl: () => URL;
	goto?: (href: string) => void;
}): DrawerTabsState<T> {
	let allowedFn: () => readonly T[];
	if (typeof config.allowed === 'function') {
		allowedFn = config.allowed;
	}
	else {
		const values = config.allowed;
		allowedFn = () => values;
	}

	return new DrawerTabsState({
		allowed: allowedFn,
		defaultTab: config.defaultTab,
		getUrl: config.getUrl,
		goto: config.goto ?? (href => appGoto(href, { replaceState: true, keepFocus: true, noScroll: true })),
	});
}
