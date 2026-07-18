<script lang="ts">
	import type { Snippet } from 'svelte';
	import { page } from '$app/stores';
	import DataState from '$lib/components/ui/DataState.svelte';
	import PageQuery from '$lib/components/ui/PageQuery.svelte';
	import { detailHref } from '$lib/detail-hrefs';
	import { listRouteCacheKey } from '$lib/detail-route-patterns';
	import { t } from '$lib/i18n';
	import { readClassGroupListFilters } from '$lib/list/list-url-filters';
	import { appGoto } from '$lib/navigation/app-navigation';
	import { detailNavigationSearch } from '$lib/navigation/detail-navigation';
	import { registerVersionInvalidation } from '$lib/navigation/invalidate-on-navigate';
	import { releaseRoutePageQueryOnDestroy } from '$lib/queries/route-page-query-lifecycle.svelte';
	import {
		ClassesPageState,
		setClassesPageState,
	} from './classes-page.svelte';
	import ClassGroupsList from './components/ClassGroupsList.svelte';

	const { children: pageChildren }: { children: Snippet } = $props();

	const classesPage = new ClassesPageState(() => $page.url);
	setClassesPageState(classesPage);
	registerVersionInvalidation(classesPage);
	releaseRoutePageQueryOnDestroy(() => $page.url);

	const selectedId = $derived(classesPage.selectedId);
	const query = classesPage.queryListPage();
	const urlFilters = $derived(readClassGroupListFilters($page.url));

	$effect(() => {
		classesPage.filters.hydrate(urlFilters);
	});

	function selectClassGroup(classGroup: { id: string }) {
		const path = detailHref.configClassGroup(classGroup.id);
		appGoto(`${path}${detailNavigationSearch($page.url)}`);
	}
</script>

<PageQuery {query} cacheKey={listRouteCacheKey} loadingTitle={$t('classGroups.subtitle')}>
	{#snippet children(data)}
		<DataState
			preserveShell
			status={data.status}
			errorMessage={data.errorMessage}
			emptyTitle={$t('classGroups.subtitle')}
			emptyDescription={$t('dataState.emptyDescription')}
		>
			<ClassGroupsList {selectedId} onSelect={selectClassGroup} />
			{@render pageChildren()}
		</DataState>
	{/snippet}
</PageQuery>
