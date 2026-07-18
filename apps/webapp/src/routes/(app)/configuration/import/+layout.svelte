<script lang="ts">
	import type { Snippet } from 'svelte';
	import { page } from '$app/stores';
	import DataState from '$lib/components/ui/DataState.svelte';
	import PageQuery from '$lib/components/ui/PageQuery.svelte';
	import { listRouteCacheKey } from '$lib/detail-route-patterns';
	import { t } from '$lib/i18n';
	import { registerVersionInvalidation } from '$lib/navigation/invalidate-on-navigate';
	import { releaseRoutePageQueryOnDestroy } from '$lib/queries/route-page-query-lifecycle.svelte';
	import ImportDataView from './components/ImportDataView.svelte';
	import {
		ImportPageState,
		setImportPageState,
	} from './import-page.svelte';

	const { children: pageChildren }: { children: Snippet } = $props();

	const importPage = new ImportPageState();
	setImportPageState(importPage);
	registerVersionInvalidation(importPage);
	releaseRoutePageQueryOnDestroy(() => $page.url);

	const query = importPage.queryListPage();
</script>

<PageQuery {query} cacheKey={listRouteCacheKey} loadingTitle={$t('import.title')}>
	{#snippet children(data)}
		<DataState
			status={data.status}
			errorMessage={data.errorMessage}
			emptyTitle={$t('import.title')}
			emptyDescription={$t('dataState.emptyDescription')}
		>
			<ImportDataView />
			{@render pageChildren()}
		</DataState>
	{/snippet}
</PageQuery>
