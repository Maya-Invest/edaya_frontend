<script lang="ts">
	import type { Snippet } from 'svelte';
	import { page } from '$app/stores';
	import DataState from '$lib/components/ui/DataState.svelte';
	import PageQuery from '$lib/components/ui/PageQuery.svelte';
	import { listRouteCacheKey } from '$lib/detail-route-patterns';
	import { t } from '$lib/i18n';
	import { registerVersionInvalidation } from '$lib/navigation/invalidate-on-navigate';
	import { releaseRoutePageQueryOnDestroy } from '$lib/queries/route-page-query-lifecycle.svelte';
	import ReconciliationList from './components/ReconciliationList.svelte';
	import {
		ReconciliationPageState,
		setReconciliationPageState,
	} from './reconciliation-page.svelte';

	const { children: pageChildren }: { children: Snippet } = $props();

	const reconciliationPage = new ReconciliationPageState();
	setReconciliationPageState(reconciliationPage);
	registerVersionInvalidation(reconciliationPage);
	releaseRoutePageQueryOnDestroy(() => $page.url);

	const query = reconciliationPage.queryListPage();
</script>

<PageQuery {query} cacheKey={listRouteCacheKey} loadingTitle={$t('finance.reconciliation')}>
	{#snippet children(data)}
		<DataState
			preserveShell
			status={data.status}
			errorMessage={data.errorMessage}
			emptyTitle={$t('finance.reconciliation')}
			emptyDescription={$t('dataState.emptyDescription')}
		>
			<ReconciliationList />
			{@render pageChildren()}
		</DataState>
	{/snippet}
</PageQuery>
