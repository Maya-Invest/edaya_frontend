<script lang="ts">
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
	import { currentRouteSurfaceHref, openDetailDrawer } from '$lib/navigation/route-surface-navigation';
	import { releaseRoutePageQueryOnDestroy } from '$lib/queries/route-page-query-lifecycle.svelte';
	import {
		ClassesPageState,
		setClassesPageState,
	} from './classes-page.svelte';
	import ClassGroupsList from './components/ClassGroupsList.svelte';
	import { readClassGroupsListFilters } from './lib/class-groups-list-filters';

	const { children: pageChildren }: { children: Snippet } = $props();

	const classesPage = new ClassesPageState(() => $page.url);
	setClassesPageState(classesPage);
	registerVersionInvalidation(classesPage);
	releaseRoutePageQueryOnDestroy(() => $page.url);

	const selectedId = $derived(classesPage.selectedId);
	const query = classesPage.queryListPage();
	const urlFilters = $derived(readClassGroupsListFilters($page.url));

	$effect(() => {
		classesPage.filters.hydrate(urlFilters);
	});

	$effect(() => {
		const levelId = academicContext.classes.find(cls => cls.id === $page.params.id)?.gradeLevelId;
		if (levelId && $page.url.searchParams.get('gradeLevel') !== levelId) {
			const next = new URL($page.url);
			next.searchParams.set('gradeLevel', levelId);
			void appGoto(`${next.pathname}${next.search}`, { replaceState: true, noScroll: true });
		}
	});

	function selectClassGroup(classGroup: { id: string }) {
		const path = detailHref.configClassGroup(classGroup.id);
		const target = new URL(`${path}${detailNavigationSearch($page.url)}`, $page.url);
		openDetailDrawer(`${target.pathname}${target.search}`, currentRouteSurfaceHref($page.url));
	}
</script>

<PageQuery {query} cacheKey={listRouteCacheKey} loadingTitle={$t('structure.classes')}>
	{#snippet children(data)}
		<DataState
			preserveShell
			status={data.status}
			errorMessage={data.errorMessage}
			emptyTitle={$t('structure.classes')}
			emptyDescription={$t('dataState.emptyDescription')}
		>
			<ClassGroupsList {selectedId} onSelect={selectClassGroup} />
			{@render pageChildren()}
		</DataState>
	{/snippet}
</PageQuery>
