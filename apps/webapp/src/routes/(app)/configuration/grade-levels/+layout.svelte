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
	import GradeLevelsList from './components/GradeLevelsList.svelte';
	import {
		GradeLevelsPageState,
		setGradeLevelsPageState,
	} from './grade-levels-page.svelte';
	import { readGradeLevelsListFilters } from './lib/grade-levels-list-filters';

	const { children: pageChildren }: { children: Snippet } = $props();

	const gradeLevelsPage = new GradeLevelsPageState(() => $page.url);
	setGradeLevelsPageState(gradeLevelsPage);
	registerVersionInvalidation(gradeLevelsPage);
	releaseRoutePageQueryOnDestroy(() => $page.url);

	const selectedId = $derived(gradeLevelsPage.selectedId);
	const query = gradeLevelsPage.queryListPage();
	const urlFilters = $derived(readGradeLevelsListFilters($page.url));

	$effect(() => {
		gradeLevelsPage.filters.hydrate(urlFilters);
	});

	function selectGradeLevel(level: { id: string }) {
		const path = detailHref.configGradeLevel(level.id);
		appGoto(`${path}${detailNavigationSearch($page.url)}`);
	}
</script>

<PageQuery {query} cacheKey={listRouteCacheKey} loadingTitle={$t('gradeLevels.subtitle')}>
	{#snippet children(data)}
		<DataState
			preserveShell
			status={data.status}
			errorMessage={data.errorMessage}
			emptyTitle={$t('gradeLevels.subtitle')}
			emptyDescription={$t('dataState.emptyDescription')}
		>
			<GradeLevelsList {selectedId} onSelect={selectGradeLevel} />
			{@render pageChildren()}
		</DataState>
	{/snippet}
</PageQuery>
