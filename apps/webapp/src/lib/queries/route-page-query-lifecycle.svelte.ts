import { listRouteCacheKey } from '$lib/detail-route-patterns';
import { invalidatePageQueryCacheForRoute } from '$lib/queries/page-query-cache';
import { onDestroy } from 'svelte';

/**
 * Route state lives on the layout instance — clear the list PageQuery cache and nested
 * drawer-tab entries when the layout unmounts so the next visit re-runs load.
 */
export function releaseRoutePageQueryOnDestroy(getUrl: () => URL) {
	let listCacheKey = listRouteCacheKey(getUrl());

	$effect(() => {
		listCacheKey = listRouteCacheKey(getUrl());
	});

	onDestroy(() => {
		invalidatePageQueryCacheForRoute(listCacheKey);
	});
}
