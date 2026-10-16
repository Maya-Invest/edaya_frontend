<script lang="ts">
	import type { ReportCardDefinition } from '$lib/types/report-cards';
	import type { Snippet } from 'svelte';
	import { page } from '$app/stores';
	import { academicContext } from '$lib/academic/context.svelte';
	import DataState from '$lib/components/ui/DataState.svelte';
	import PageQuery from '$lib/components/ui/PageQuery.svelte';
	import { detailHref } from '$lib/detail-hrefs';
	import { listRouteCacheKey } from '$lib/detail-route-patterns';
	import { t } from '$lib/i18n';
	import { appGoto } from '$lib/navigation/app-navigation';
	import { detailNavigationSearch } from '$lib/navigation/detail-navigation';
	import { registerVersionInvalidation } from '$lib/navigation/invalidate-on-navigate';
	import { currentRouteSurfaceHref, listSurfaceHref, openDetailDrawer } from '$lib/navigation/route-surface-navigation';
	import { hasAnyPermission } from '$lib/permissions';
	import { releaseRoutePageQueryOnDestroy } from '$lib/queries/route-page-query-lifecycle.svelte';
	import LevelDetails from '../levels/components/LevelDetails.svelte';
	import { getGradeLevelsPageState } from '../levels/grade-levels-page.svelte';
	import { structureHref } from '../lib/structure-navigation';
	import ReportCardDefinitionsList from './report-cards/components/ReportCardDefinitionsList.svelte';
	import { ReportCardsPageState, setReportCardsPageState } from './report-cards/report-cards-page.svelte';

	const { children: pageChildren }: { children: Snippet } = $props();
	const levelsPage = getGradeLevelsPageState();
	const reportCardsPage = new ReportCardsPageState(() => $page.url);
	setReportCardsPageState(reportCardsPage);
	registerVersionInvalidation(reportCardsPage);
	releaseRoutePageQueryOnDestroy(() => $page.url);
	const level = $derived(levelsPage.gradeLevelById($page.url.searchParams.get('gradeLevel') ?? ''));
	const canConfigureReports = $derived(hasAnyPermission(['REPORT_CARD_CONFIGURE']));
	const query = reportCardsPage.queryListPage();
	let resolvedId = '';
	let previousYear = academicContext.yearId;
	$effect(() => {
		const year = academicContext.yearId;
		if (year !== previousYear && !reportCardsPage.selectedId && $page.url.searchParams.get('modal') === 'create')
			void appGoto(listSurfaceHref('/configuration/structure/details', $page.url), { replaceState: true });
		previousYear = year;
	});

	$effect(() => {
		const definition = reportCardsPage.selected;
		if (!reportCardsPage.selectedId) {
			resolvedId = '';
			return;
		}
		if (!definition)
			return;
		// A direct or legacy link first selects the record's own academic context.
		if (resolvedId !== definition.id) {
			resolvedId = definition.id;
			if (academicContext.yearId !== definition.academicYearId)
				academicContext.setYear(definition.academicYearId);
			if ($page.url.searchParams.get('gradeLevel') !== definition.gradeLevelId) {
				const next = new URL($page.url);
				next.searchParams.set('gradeLevel', definition.gradeLevelId);
				void appGoto(`${next.pathname}${next.search}`, { replaceState: true, noScroll: true });
			}
		}
		else if (academicContext.yearId !== definition.academicYearId) {
			// An explicit workspace-year change closes the previous year's drawer.
			void appGoto(structureHref($page.url, definition.gradeLevelId, 'details'), { replaceState: true });
		}
	});

	function selectDefinition(definition: ReportCardDefinition) {
		openDetailDrawer(`${detailHref.configReportCard(definition.id)}${detailNavigationSearch($page.url)}`, currentRouteSurfaceHref($page.url));
	}
</script>

{#if level}
	{#key `${level.id}:${academicContext.yearId}`}
		<LevelDetails gradeLevel={level} />
	{/key}
{/if}
{#if canConfigureReports}
	<PageQuery {query} cache={false} cacheKey={listRouteCacheKey} loadingTitle={$t('reportCards.templates')}>
		{#snippet children(data)}
			<DataState preserveShell status={data.status} errorMessage={data.errorMessage} emptyTitle={$t('reportCards.templates')} emptyDescription={$t('dataState.emptyDescription')}>
				{#if level}
					{#key `${level.id}:${academicContext.yearId}`}
						<ReportCardDefinitionsList gradeLevelId={level.id} selectedId={reportCardsPage.selectedId} onSelect={selectDefinition} />
					{/key}
				{/if}
				{@render pageChildren()}
			</DataState>
		{/snippet}
	</PageQuery>
{/if}
