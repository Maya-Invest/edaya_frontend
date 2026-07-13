<script lang="ts">
	import type { Snippet } from 'svelte';
	import { page } from '$app/stores';
	import DataState from '$lib/components/ui/DataState.svelte';
	import PageQuery from '$lib/components/ui/PageQuery.svelte';
	import { detailHref } from '$lib/detail-hrefs';
	import { listRouteCacheKey } from '$lib/detail-route-patterns';
	import { t } from '$lib/i18n';
	import { appGoto } from '$lib/navigation/app-navigation';
	import { detailNavigationSearch } from '$lib/navigation/detail-navigation';
	import { registerVersionInvalidation } from '$lib/navigation/invalidate-on-navigate';
	import { releaseRoutePageQueryOnDestroy } from '$lib/queries/route-page-query-lifecycle.svelte';
	import ReportCardsList from './components/ReportCardsList.svelte';
	import {
		ReportCardsPageState,
		setReportCardsPageState,
	} from './report-cards-page.svelte';

	const { children: pageChildren }: { children: Snippet } = $props();

	const reportCardsPage = new ReportCardsPageState(() => $page.url);
	setReportCardsPageState(reportCardsPage);
	registerVersionInvalidation(reportCardsPage);
	releaseRoutePageQueryOnDestroy(() => $page.url);

	const classId = $derived($page.params.classId ?? '6a');
	const selectedId = $derived(reportCardsPage.selectedId);
	const query = $derived(reportCardsPage.queryListPage(classId));

	function selectResult(result: import('$lib/types/report-cards').ReportCardResult) {
		const path = detailHref.classReportCard(classId, result.id);
		appGoto(`${path}${detailNavigationSearch($page.url)}`);
	}
</script>

<PageQuery {query} cacheKey={listRouteCacheKey} loadingTitle={$t('reportCards.classTitle')}>
	{#snippet children(data)}
		<DataState
			preserveShell
			status={data.status}
			errorMessage={data.errorMessage}
			emptyTitle={$t('reportCards.classTitle')}
			emptyDescription={$t('dataState.emptyDescription')}
		>
			<ReportCardsList {classId} {selectedId} onSelect={selectResult} />
			{@render pageChildren()}
		</DataState>
	{/snippet}
</PageQuery>
