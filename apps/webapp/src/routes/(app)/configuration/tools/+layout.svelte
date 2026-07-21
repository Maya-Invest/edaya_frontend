<script lang="ts">
	import type { Snippet } from 'svelte';
	import { page } from '$app/stores';
	import { academicContext } from '$lib/academic/context.svelte';
	import DataState from '$lib/components/ui/DataState.svelte';
	import PageQuery from '$lib/components/ui/PageQuery.svelte';
	import { listRouteCacheKey } from '$lib/detail-route-patterns';
	import { t } from '$lib/i18n';
	import { registerVersionInvalidation } from '$lib/navigation/invalidate-on-navigate';
	import { releaseRoutePageQueryOnDestroy } from '$lib/queries/route-page-query-lifecycle.svelte';
	import ToolsHubView from './components/ToolsHubView.svelte';
	import {
		ToolsPageState,
		setToolsPageState,
	} from './tools-page.svelte';

	const { children: pageChildren }: { children: Snippet } = $props();

	const toolsPage = new ToolsPageState();
	setToolsPageState(toolsPage);
	registerVersionInvalidation(toolsPage);
	releaseRoutePageQueryOnDestroy(() => $page.url);

	const query = toolsPage.queryListPage();
	const academicSelectionKey = $derived(`${academicContext.yearId}|${academicContext.periodId}`);

	function loadPlanningData(_key: string) {
		toolsPage.planningPage.generationResult = null;
		toolsPage.planningPage.resetRange();
		void toolsPage.planningPage.load().catch(() => undefined);
	}

	$effect(() => {
		if (!academicContext.shellReady) {
			return;
		}
		loadPlanningData(academicSelectionKey);
	});
</script>

<PageQuery {query} cacheKey={listRouteCacheKey} loadingTitle={$t('tools.title')}>
	{#snippet children(data)}
		<DataState
			status={data.status}
			errorMessage={data.errorMessage}
			emptyTitle={$t('tools.title')}
			emptyDescription={$t('dataState.emptyDescription')}
		>
			<ToolsHubView />
			{@render pageChildren()}
		</DataState>
	{/snippet}
</PageQuery>
