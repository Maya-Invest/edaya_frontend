<script lang="ts">
	import type { Snippet } from 'svelte';
	import { page } from '$app/stores';
	import { academicContext } from '$lib/academic/context.svelte';
	import DataState from '$lib/components/ui/DataState.svelte';
	import PageQuery from '$lib/components/ui/PageQuery.svelte';
	import { listRouteCacheKey } from '$lib/detail-route-patterns';
	import { t } from '$lib/i18n';
	import { appPath } from '$lib/navigation/app-navigation';
	import { registerVersionInvalidation } from '$lib/navigation/invalidate-on-navigate';
	import { hasPermission } from '$lib/permissions';
	import { releaseRoutePageQueryOnDestroy } from '$lib/queries/route-page-query-lifecycle.svelte';
	import { untrack } from 'svelte';
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
	$effect(() => {
		const url = $page.url;
		if (academicContext.shellReady && url.pathname === toolsHref) {
			untrack(() => toolsPage.hydrateWorkflow());
		}
	});

	const query = toolsPage.queryListPage();
	const planningOpen = $derived(academicContext.shellReady && $page.url.pathname === toolsHref
		&& toolsPage.modals.active === 'generate-timetable' && hasPermission('TIMETABLE_MANAGE'));
	const scopeKey = $derived(`${academicContext.scopeGeneration}|${academicContext.schoolScopeId}|${academicContext.yearId}|${academicContext.periodId}`);

	$effect(() => {
		const key = scopeKey;
		if (!planningOpen)
			return;
		const planning = toolsPage.planningPage;
		untrack(() => planning.open(key));
		return () => planning.close();
	});
</script>

{#if $page.url.pathname.endsWith('/finance-checks')}
	{@render pageChildren()}
{:else}
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

{/if}
