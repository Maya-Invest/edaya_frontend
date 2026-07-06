import type { ResolvedPathname } from '$app/types';

export const DRAWER_TAB_QUERY_KEY = 'tab';

export function readDrawerTab<T extends string>(
	url: URL,
	allowed: readonly T[],
	defaultTab: T,
): T {
	const raw = url.searchParams.get(DRAWER_TAB_QUERY_KEY);
	if (raw && (allowed as readonly string[]).includes(raw)) {
		return raw as T;
	}
	return defaultTab;
}

export function writeDrawerTab(url: URL, tab: string, defaultTab: string): string {
	const next = new URL(url);
	if (tab === defaultTab) {
		next.searchParams.delete(DRAWER_TAB_QUERY_KEY);
	}
	else {
		next.searchParams.set(DRAWER_TAB_QUERY_KEY, tab);
	}
	return `${next.pathname}${next.search}`;
}

export function appendDrawerTab(
	href: string,
	tab: string | undefined,
	defaultTab: string,
): ResolvedPathname {
	if (!tab || tab === defaultTab) {
		return href as ResolvedPathname;
	}
	const url = new URL(href, 'http://local');
	url.searchParams.set(DRAWER_TAB_QUERY_KEY, tab);
	return `${url.pathname}${url.search}` as ResolvedPathname;
}
