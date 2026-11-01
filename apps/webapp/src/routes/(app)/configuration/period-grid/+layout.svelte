<script lang="ts">
	import type { Snippet } from 'svelte';
	import { page } from '$app/stores';
	import DataState from '$lib/components/ui/DataState.svelte';
	import PageQuery from '$lib/components/ui/PageQuery.svelte';
	import { listRouteCacheKey } from '$lib/detail-route-patterns';
	import { t } from '$lib/i18n';
	import { registerVersionInvalidation } from '$lib/navigation/invalidate-on-navigate';
	import { releaseRoutePageQueryOnDestroy } from '$lib/queries/route-page-query-lifecycle.svelte';
	import PeriodGridView from './components/PeriodGridView.svelte';
	import {
		PeriodGridPageState,
		setPeriodGridPageState,
	} from './period-grid-page.svelte';

	const { children: pageChildren }: { children: Snippet } = $props();

	const periodGridPage = new PeriodGridPageState(() => $page.url);
	setPeriodGridPageState(periodGridPage);
	registerVersionInvalidation(periodGridPage);
	releaseRoutePageQueryOnDestroy(() => $page.url);

	const query = periodGridPage.queryListPage();
</script>

<PageQuery {query} cacheKey={listRouteCacheKey} loadingTitle={$t('config.periodGrid')}>
	{#snippet children(data)}
		<DataState
			preserveShell
			status={data.status}
			errorMessage={data.errorMessage}
			emptyTitle={$t('periodDefinitions.sectionTitle')}
			emptyDescription={$t('dataState.emptyDescription')}
		>
			<PeriodGridView />
			{@render pageChildren()}
		</DataState>
	{/snippet}
</PageQuery>
