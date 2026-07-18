<script lang="ts">
	import type { Snippet } from 'svelte';
	import { page } from '$app/stores';
	import DataState from '$lib/components/ui/DataState.svelte';
	import PageQuery from '$lib/components/ui/PageQuery.svelte';
	import { listRouteCacheKey } from '$lib/detail-route-patterns';
	import { t } from '$lib/i18n';
	import { readDisciplineCatalogListFilters } from '$lib/list/list-url-filters';
	import { registerVersionInvalidation } from '$lib/navigation/invalidate-on-navigate';
	import { releaseRoutePageQueryOnDestroy } from '$lib/queries/route-page-query-lifecycle.svelte';
	import DisciplinaryCatalogList from './components/DisciplinaryCatalogList.svelte';
	import {
		DisciplinePageState,
		setDisciplinePageState,
	} from './discipline-page.svelte';

	const { children: pageChildren }: { children: Snippet } = $props();

	const disciplinePage = new DisciplinePageState(() => $page.url);
	setDisciplinePageState(disciplinePage);
	registerVersionInvalidation(disciplinePage);
	releaseRoutePageQueryOnDestroy(() => $page.url);

	const query = disciplinePage.queryListPage();
	const urlFilters = $derived(readDisciplineCatalogListFilters($page.url));

	$effect(() => {
		disciplinePage.filters.hydrate(urlFilters);
	});
</script>

<PageQuery {query} cacheKey={listRouteCacheKey} loadingTitle={$t('config.discipline')}>
	{#snippet children(data)}
		<DataState
			preserveShell
			status={data.status}
			errorMessage={data.errorMessage}
			emptyTitle={$t('disciplinaryCatalog.subtitle')}
			emptyDescription={$t('dataState.emptyDescription')}
		>
			<DisciplinaryCatalogList />
			{@render pageChildren()}
		</DataState>
	{/snippet}
</PageQuery>
