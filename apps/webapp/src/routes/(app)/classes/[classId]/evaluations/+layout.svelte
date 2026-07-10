<script lang="ts">
	import type { Snippet } from 'svelte';
	import { page } from '$app/stores';
	import DataState from '$lib/components/ui/DataState.svelte';
	import PageQuery from '$lib/components/ui/PageQuery.svelte';
	import { listRouteCacheKey } from '$lib/detail-route-patterns';
	import { t } from '$lib/i18n';
	import { releaseRoutePageQueryOnDestroy } from '$lib/queries/route-page-query-lifecycle.svelte';
	import EvaluationsList from './components/EvaluationsList.svelte';
	import EvaluationsPageHydrator from './components/EvaluationsPageHydrator.svelte';
	import {
		EvaluationsPageState,
		setEvaluationsPageState,
	} from './evaluations-page.svelte';

	const { children: pageChildren }: { children: Snippet } = $props();

	const evaluationsPage = new EvaluationsPageState(() => $page.url);
	setEvaluationsPageState(evaluationsPage);
	releaseRoutePageQueryOnDestroy(() => $page.url);

	const classId = $derived($page.params.classId ?? '6a');
	const selectedId = $derived(evaluationsPage.selectedId);
	const query = $derived(evaluationsPage.queryListPage(classId));
</script>

<PageQuery {query} cacheKey={listRouteCacheKey} loadingTitle={$t('tab.evaluations')}>
	{#snippet children(data)}
		<EvaluationsPageHydrator {data} />
		<DataState
			preserveShell
			status={data.status}
			errorMessage={data.errorMessage}
			emptyTitle={$t('tab.evaluations')}
			emptyDescription={$t('dataState.emptyDescription')}
		>
			<EvaluationsList {classId} {selectedId} />
			{@render pageChildren()}
		</DataState>
	{/snippet}
</PageQuery>
