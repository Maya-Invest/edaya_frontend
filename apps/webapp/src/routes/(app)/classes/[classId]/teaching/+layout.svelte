<script lang="ts">
	import type { Snippet } from 'svelte';
	import { page } from '$app/stores';
	import DataState from '$lib/components/ui/DataState.svelte';
	import PageQuery from '$lib/components/ui/PageQuery.svelte';
	import { listRouteCacheKey } from '$lib/detail-route-patterns';
	import { t } from '$lib/i18n';
	import { registerVersionInvalidation } from '$lib/navigation/invalidate-on-navigate';
	import { releaseRoutePageQueryOnDestroy } from '$lib/queries/route-page-query-lifecycle.svelte';
	import TeachingList from './components/TeachingList.svelte';
	import TeachingPageHydrator from './components/TeachingPageHydrator.svelte';
	import {
		setTeachingPageState,
		TeachingPageState,
	} from './teaching-page.svelte';

	const { children: pageChildren }: { children: Snippet } = $props();

	const teachingPage = new TeachingPageState(() => $page.url);
	setTeachingPageState(teachingPage);
	registerVersionInvalidation(teachingPage);
	releaseRoutePageQueryOnDestroy(() => $page.url);

	const classId = $derived($page.params.classId ?? '6a');
	const selectedId = $derived(teachingPage.selectedId);
	const query = teachingPage.queryListPage();
</script>

<PageQuery {query} cacheKey={listRouteCacheKey} loadingTitle={$t('tab.teaching')}>
	{#snippet children(data)}
		<TeachingPageHydrator {data} />
		<DataState
			preserveShell
			status={data.status}
			errorMessage={data.errorMessage}
			emptyTitle={$t('tab.teaching')}
			emptyDescription={$t('dataState.emptyDescription')}
		>
			<TeachingList {classId} {selectedId} />
			{@render pageChildren()}
		</DataState>
	{/snippet}
</PageQuery>
