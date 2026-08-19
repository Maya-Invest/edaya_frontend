<script lang="ts">
	import type { Snippet } from 'svelte';
	import { afterNavigate } from '$app/navigation';
	import { page } from '$app/stores';
	import { academicContext } from '$lib/academic/context.svelte';
	import DataState from '$lib/components/ui/DataState.svelte';
	import PageQuery from '$lib/components/ui/PageQuery.svelte';
	import { listRouteCacheKey } from '$lib/detail-route-patterns';
	import { t } from '$lib/i18n';
	import { appPath } from '$lib/navigation/app-navigation';
	import { registerVersionInvalidation } from '$lib/navigation/invalidate-on-navigate';
	import { releaseRoutePageQueryOnDestroy } from '$lib/queries/route-page-query-lifecycle.svelte';
	import {
		ToolsPageState,
		setToolsPageState,
	} from './tools-page.svelte';

	const { children: pageChildren }: { children: Snippet } = $props();
	const toolsHref = appPath('/(app)/configuration/tools');

	const toolsPage = new ToolsPageState(() => $page.url);
	setToolsPageState(toolsPage);
	registerVersionInvalidation(toolsPage);
	releaseRoutePageQueryOnDestroy(() => $page.url);
	afterNavigate(() => {
		if ($page.url.pathname === toolsHref) {
			toolsPage.hydrateWorkflow();
		}
	});

	const query = toolsPage.queryListPage();
	const academicSelectionKey = $derived(`${academicContext.yearId}|${academicContext.periodId}`);

	async function loadPlanningData(_key: string) {
		toolsPage.planningPage.generationResult = null;
		toolsPage.planningPage.resetRange();
		try {
			await toolsPage.planningPage.load();
		}
		catch { /* The planning state owns its load error; keep deep links until a load succeeds. */ }
		finally {
			toolsPage.reconcilePublishAvailability();
		}
	}

	$effect(() => {
		if (!academicContext.shellReady) {
			return;
		}
		void loadPlanningData(academicSelectionKey);
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
			{@render pageChildren()}
		</DataState>
	{/snippet}
</PageQuery>
