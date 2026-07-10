import { onDestroy } from 'svelte';
import { listRouteCacheKey } from '$lib/detail-route-patterns';
import { invalidatePageQueryCache } from '$lib/queries/page-query-cache';

/**
 * Route state lives on the layout instance — clear the list PageQuery cache when
 * the layout unmounts so the next visit re-runs load and seeds a fresh state class.
 */
export function releaseRoutePageQueryOnDestroy(getUrl: () => URL) {
	let listCacheKey = listRouteCacheKey(getUrl());

	$effect(() => {
		listCacheKey = listRouteCacheKey(getUrl());
	});

	onDestroy(() => {
		invalidatePageQueryCache(listCacheKey);
	});
}
