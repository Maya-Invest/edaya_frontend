<script lang="ts" generics="T extends PageLoadMeta">
	import type { PageLoadMeta } from '$lib/page/load-state';
	import type { Snippet } from 'svelte';
	import { page } from '$app/stores';
	import { listRouteCacheKey } from '$lib/detail-route-patterns';
	import { t } from '$lib/i18n';
	import { LoaderCircle } from '$lib/icons';
	import { getPageQueryCache, setPageQueryCache } from '$lib/queries/page-query-cache';
	import { pageQueryStatus } from '$lib/queries/page-query-status.svelte';
	import { untrack } from 'svelte';

	const {
		query,
		cacheKey = listRouteCacheKey,
		loadingTitle,
		children,
	}: {
		query: (url: URL) => Promise<T>;
		cacheKey?: (url: URL) => string;
		loadingTitle?: string;
		children: Snippet<[T]>;
	} = $props();

	let result = $state<T | null>(null);
	let loadedKey = $state<string | null>(null);
	let inFlightKey = $state<string | null>(null);
	let loadVersion = 0;

	$effect(() => {
		const url = $page.url;
		const key = cacheKey(url);

		if (key === loadedKey && result !== null) {
			return;
		}
		if (key === inFlightKey) {
			return;
		}

		const cached = getPageQueryCache<T>(key);
		if (cached) {
			result = cached;
			loadedKey = key;
			pageQueryStatus.markReady(key);
			return;
		}

		inFlightKey = key;
		const version = ++loadVersion;
		if (key !== loadedKey) {
			result = null;
		}
		pageQueryStatus.markPending(key);

		const runQuery = untrack(() => query);
		void runQuery(url)
			.then((data) => {
				if (version !== loadVersion) {
					return;
				}
				result = data;
				loadedKey = key;
				inFlightKey = null;
				setPageQueryCache(key, data);
				pageQueryStatus.markReady(key);
			})
			.catch(() => {
				if (version !== loadVersion) {
					return;
				}
				inFlightKey = null;
				const fallback = {
					status: 'error',
					errorMessage: 'Unable to load this page.',
				} as T;
				result = fallback;
				loadedKey = key;
				pageQueryStatus.markReady(key);
			});
	});
</script>

{#if result}
	{@render children(result)}
{:else}
	<div
		class="flex min-h-[40vh] flex-col items-center justify-center gap-4 p-8 animate-fade-in"
		role="status"
		aria-live="polite"
	>
		<LoaderCircle class="h-8 w-8 animate-spin text-primary" />
		<p class="text-sm text-muted-foreground">{loadingTitle ?? $t('dataState.loading')}</p>
	</div>
{/if}
