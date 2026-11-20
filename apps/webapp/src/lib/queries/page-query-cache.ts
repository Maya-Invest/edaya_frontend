import type { PageLoadMeta } from '$lib/page/load-state';
import { isCacheablePageQueryResult, stripAcademicScope } from '$lib/queries/page-query-runtime';

type PageQueryCacheEntry = PageLoadMeta & Record<string, unknown>;

const cache = new Map<string, PageQueryCacheEntry>();

export function getPageQueryCache<T extends PageLoadMeta = PageQueryCacheEntry>(key: string): T | undefined {
	return cache.get(key) as T | undefined;
}

export function setPageQueryCache<T extends PageLoadMeta>(key: string, data: T): void {
	if (!isCacheablePageQueryResult(data)) {
		return;
	}
	cache.set(key, data as PageQueryCacheEntry);
}

function cacheKeyPathname(key: string): string {
	return stripAcademicScope(key).split('?')[0] ?? stripAcademicScope(key);
}

/** Evict a list key and nested drawer-tab entries for the same route. */
export function invalidatePageQueryCacheForRoute(listKey: string): void {
	const listPath = cacheKeyPathname(listKey);
	for (const key of [...cache.keys()]) {
		const path = cacheKeyPathname(key);
		if (path === listPath || path.startsWith(`${listPath}/`)) {
			cache.delete(key);
		}
	}
}

export function invalidatePageQueryCache(key?: string): void {
	if (key) {
		cache.delete(key);
		return;
	}
	cache.clear();
}
