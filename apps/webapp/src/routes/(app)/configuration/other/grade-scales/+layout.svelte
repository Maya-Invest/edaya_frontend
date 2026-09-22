<script lang="ts">
	import type { Snippet } from 'svelte';
	import { page } from '$app/stores';
	import DataState from '$lib/components/ui/DataState.svelte';
	import PageQuery from '$lib/components/ui/PageQuery.svelte';
	import { listRouteCacheKey } from '$lib/detail-route-patterns';
	import { t } from '$lib/i18n';
	import { readGradeScaleListFilters } from '$lib/list/list-url-filters';
	import { registerVersionInvalidation } from '$lib/navigation/invalidate-on-navigate';
	import { releaseRoutePageQueryOnDestroy } from '$lib/queries/route-page-query-lifecycle.svelte';
	import GradeScalesList from './components/GradeScalesList.svelte';
	import {
		GradeScalesPageState,
		setGradeScalesPageState,
	} from './grade-scales-page.svelte';

	const { children: pageChildren }: { children: Snippet } = $props();

	const gradeScalesPage = new GradeScalesPageState(() => $page.url);
	setGradeScalesPageState(gradeScalesPage);
	registerVersionInvalidation(gradeScalesPage);
	releaseRoutePageQueryOnDestroy(() => $page.url);

	const query = gradeScalesPage.queryListPage();
	const urlFilters = $derived(readGradeScaleListFilters($page.url));

	$effect(() => {
		gradeScalesPage.filters.hydrate(urlFilters);
	});
</script>

<PageQuery {query} cacheKey={listRouteCacheKey} loadingTitle={$t('config.gradeScales')}>
	{#snippet children(data)}
		<DataState
			preserveShell
			status={data.status}
			errorMessage={data.errorMessage}
			emptyTitle={$t('gradeScales.subtitle')}
			emptyDescription={$t('dataState.emptyDescription')}
		>
			<GradeScalesList />
			{@render pageChildren()}
		</DataState>
	{/snippet}
</PageQuery>
