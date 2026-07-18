<script lang="ts">
	import type { Snippet } from 'svelte';
	import { page } from '$app/stores';
	import DataState from '$lib/components/ui/DataState.svelte';
	import PageQuery from '$lib/components/ui/PageQuery.svelte';
	import { listRouteCacheKey } from '$lib/detail-route-patterns';
	import { t } from '$lib/i18n';
	import { registerVersionInvalidation } from '$lib/navigation/invalidate-on-navigate';
	import { releaseRoutePageQueryOnDestroy } from '$lib/queries/route-page-query-lifecycle.svelte';
	import FeesList from './components/FeesList.svelte';
	import {
		FeesPageState,
		setFeesPageState,
	} from './fees-page.svelte';

	const { children: pageChildren }: { children: Snippet } = $props();

	const feesPage = new FeesPageState();
	setFeesPageState(feesPage);
	registerVersionInvalidation(feesPage);
	releaseRoutePageQueryOnDestroy(() => $page.url);

	const query = feesPage.queryListPage();
</script>

<PageQuery {query} cacheKey={listRouteCacheKey} loadingTitle={$t('finance.fees')}>
	{#snippet children(data)}
		<DataState
			preserveShell
			status={data.status}
			errorMessage={data.errorMessage}
			emptyTitle={$t('finance.fees')}
			emptyDescription={$t('dataState.emptyDescription')}
		>
			<FeesList />
			{@render pageChildren()}
		</DataState>
	{/snippet}
</PageQuery>
