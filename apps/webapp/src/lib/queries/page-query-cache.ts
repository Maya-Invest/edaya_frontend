import type { PageLoadMeta } from '$lib/page/load-state';

const cache = new Map<string, PageLoadMeta>();

export function getPageQueryCache<T extends PageLoadMeta>(key: string): T | undefined {
	return cache.get(key) as T | undefined;
}

export function setPageQueryCache(key: string, data: PageLoadMeta): void {
	cache.set(key, data);
}

export function invalidatePageQueryCache(key?: string): void {
	if (key) {
		cache.delete(key);
		return;
	}
	cache.clear();
}
