<script lang="ts" generics="T extends PageLoadMeta">
	import type { PageLoadMeta } from '$lib/page/load-state';
	import type { PageQueryFn } from '$lib/queries/page-query-runtime';
	import type { Snippet } from 'svelte';
	import { page } from '$app/stores';
	import { academicContext } from '$lib/academic/context.svelte';
	import { listRouteCacheKey } from '$lib/detail-route-patterns';
	import { t } from '$lib/i18n';
	import { LoaderCircle } from '$lib/icons';
	import {
		getPageQueryCache,
		invalidatePageQueryCache,
		setPageQueryCache,
	} from '$lib/queries/page-query-cache';
	import {
		bindPageQuery,
		composePageQueryIdentity,
		isPageQueryAbortError,
	} from '$lib/queries/page-query-runtime';
	import { pageQueryStatus } from '$lib/queries/page-query-status.svelte';
	import { PAGE_QUERY_RETRY } from '$lib/queries/retry-context';
	import { onDestroy, untrack, setContext } from 'svelte';

	const {
		query,
		cacheKey = listRouteCacheKey,
		cache = true,
		preserveWhileLoading = false,
		loadingTitle,
		children,
	}: {
		query: PageQueryFn<T>;
		cacheKey?: (url: URL) => string;
		cache?: boolean;
		/** Keep mounted forms during a refresh of the same route and account scope. */
		preserveWhileLoading?: boolean;
		loadingTitle?: string;
		children: Snippet<[T]>;
	} = $props();

	let result = $state<T | null>(null);
	let loadedKey = $state<string | null>(null);
	let instanceCacheKey: string | null = null;
	let loadVersion = 0;
	let loadedSurface: string | null = null;
	setContext(PAGE_QUERY_RETRY, () => {
		if (instanceCacheKey)
			invalidatePageQueryCache(instanceCacheKey);
		loadedKey = null;
	});

	$effect(() => {
		const url = $page.url;
		const generation = academicContext.scopeGeneration;
		const resolveKey = untrack(() => cacheKey);
		const key = resolveKey(url);
		const identity = composePageQueryIdentity(key, generation);
		const surface = `${url.pathname}|${generation}`;
		instanceCacheKey = key;

		const controller = new AbortController();
		const version = ++loadVersion;

		if (identity === loadedKey && result !== null) {
			return () => {
				controller.abort();
			};
		}

		const cached = cache ? getPageQueryCache<T>(key) : undefined;
		if (cached) {
			result = cached;
			loadedKey = identity;
			loadedSurface = surface;
			pageQueryStatus.markReady(key);
			return () => {
				controller.abort();
			};
		}

		if (identity !== loadedKey && (!preserveWhileLoading || loadedSurface !== surface)) {
			result = null;
		}
		pageQueryStatus.markPending(key);

		const runQuery = untrack(() => bindPageQuery(query));
		void runQuery(url, { signal: controller.signal })
			.then((data) => {
				if (version !== loadVersion || controller.signal.aborted) {
					return;
				}
				result = data;
				loadedKey = identity;
				loadedSurface = surface;
				if (cache) {
					setPageQueryCache(key, data);
				}
				pageQueryStatus.markReady(key);
			})
			.catch((error: unknown) => {
				if (
					version !== loadVersion
					|| controller.signal.aborted
					|| isPageQueryAbortError(error)
				) {
					return;
				}
				const fallback = {
					status: 'error',
					errorMessage: 'Unable to load this page.',
				} as T;
				result = fallback;
				loadedKey = identity;
				pageQueryStatus.markReady(key);
			});

		return () => {
			controller.abort();
		};
	});

	onDestroy(() => {
		loadVersion += 1;
		if (cache && instanceCacheKey) {
			invalidatePageQueryCache(instanceCacheKey);
		}
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
