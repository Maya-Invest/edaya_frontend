<script lang="ts">
	import type { ReportCardDefinition } from '$lib/types/report-cards';
	import type { Snippet } from 'svelte';
	import { page } from '$app/stores';
	import DataState from '$lib/components/ui/DataState.svelte';
	import PageQuery from '$lib/components/ui/PageQuery.svelte';
	import { detailHref } from '$lib/detail-hrefs';
	import { listRouteCacheKey } from '$lib/detail-route-patterns';
	import { t } from '$lib/i18n';
	import { readReportCardDefinitionListFilters } from '$lib/list/list-url-filters';
	import { detailNavigationSearch } from '$lib/navigation/detail-navigation';
	import { registerVersionInvalidation } from '$lib/navigation/invalidate-on-navigate';
	import { currentRouteSurfaceHref, openDetailDrawer } from '$lib/navigation/route-surface-navigation';
	import { releaseRoutePageQueryOnDestroy } from '$lib/queries/route-page-query-lifecycle.svelte';
	import ReportCardDefinitionsList from './components/ReportCardDefinitionsList.svelte';
	import {
		ReportCardsPageState,
		setReportCardsPageState,
	} from './report-cards-page.svelte';

	const { children: pageChildren }: { children: Snippet } = $props();

	const reportCardsPage = new ReportCardsPageState(() => $page.url);
	setReportCardsPageState(reportCardsPage);
	registerVersionInvalidation(reportCardsPage);
	releaseRoutePageQueryOnDestroy(() => $page.url);

	const selectedId = $derived(reportCardsPage.selectedId);
	const query = reportCardsPage.queryListPage();
	const urlFilters = $derived(readReportCardDefinitionListFilters($page.url));

	const statusKeys = ['all', 'draft', 'published'] as const;

	$effect(() => {
		const next = urlFilters;
		reportCardsPage.filters.hydrate({
			q: next.q,
			status: statusKeys.includes(next.status as (typeof statusKeys)[number])
				? next.status
				: 'all',
		});
	});

	function selectDefinition(definition: ReportCardDefinition) {
		const path = detailHref.configReportCard(definition.id);
		openDetailDrawer(`${path}${detailNavigationSearch($page.url)}`, currentRouteSurfaceHref($page.url));
	}
</script>

<PageQuery {query} cacheKey={listRouteCacheKey} loadingTitle={$t('reportCards.subtitle')}>
	{#snippet children(data)}
		<DataState
			preserveShell
			status={data.status}
			errorMessage={data.errorMessage}
			emptyTitle={$t('reportCards.modelsTitle', { n: 0 })}
			emptyDescription={$t('dataState.emptyDescription')}
		>
			<ReportCardDefinitionsList
				{selectedId}
				onSelect={selectDefinition}
				loadedScales={data.scales}
				loadedDefinitions={data.definitions}
			/>
			{@render pageChildren()}
		</DataState>
	{/snippet}
</PageQuery>
