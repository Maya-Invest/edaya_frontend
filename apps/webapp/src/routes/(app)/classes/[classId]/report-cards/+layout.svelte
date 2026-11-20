<script lang="ts">
	import type { Snippet } from 'svelte';
	import { page } from '$app/stores';
	import DataState from '$lib/components/ui/DataState.svelte';
	import PageQuery from '$lib/components/ui/PageQuery.svelte';
	import { detailHref } from '$lib/detail-hrefs';
	import { listRouteCacheKey } from '$lib/detail-route-patterns';
	import { t } from '$lib/i18n';
	import { detailNavigationSearch } from '$lib/navigation/detail-navigation';
	import { registerVersionInvalidation } from '$lib/navigation/invalidate-on-navigate';
	import { currentRouteSurfaceHref, openDetailDrawer } from '$lib/navigation/route-surface-navigation';
	import { releaseRoutePageQueryOnDestroy } from '$lib/queries/route-page-query-lifecycle.svelte';
	import { onDestroy } from 'svelte';
	import ReportCardsList from './components/ReportCardsList.svelte';
	import {
		ReportCardsPageState,
		setReportCardsPageState,
	} from './report-cards-page.svelte';

	const { children: pageChildren }: { children: Snippet } = $props();

	const reportCardsPage = new ReportCardsPageState(() => $page.url);
	setReportCardsPageState(reportCardsPage);
	onDestroy(() => reportCardsPage.list.clear());
	registerVersionInvalidation(reportCardsPage);
	releaseRoutePageQueryOnDestroy(() => $page.url);

	const classId = $derived($page.params.classId ?? '6a');
	const selectedId = $derived(reportCardsPage.selectedId);
	const query = reportCardsPage.queryListPage();

	function selectResult(result: { id: string }) {
		const path = detailHref.classReportCard(classId, result.id);
		openDetailDrawer(`${path}${detailNavigationSearch($page.url)}`, currentRouteSurfaceHref($page.url));
	}
</script>

<PageQuery {query} cache={false} preserveWhileLoading loadingSurfaceKey={listRouteCacheKey} cacheKey={url => listRouteCacheKey(url) + reportCardsPage.list.key} loadingTitle={$t('reportCards.classTitle')}>
	{#snippet children(data)}
		<DataState
			preserveShell
			status={reportCardsPage.list.denied ? 'denied' : data.status}
			errorMessage={data.errorMessage}
			emptyTitle={$t('reportCards.classTitle')}
			emptyDescription={$t('dataState.emptyDescription')}
		>
			<ReportCardsList {classId} {selectedId} onSelect={selectResult} />
			{@render pageChildren()}
		</DataState>
	{/snippet}
</PageQuery>
