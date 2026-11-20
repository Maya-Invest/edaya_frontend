<script lang="ts">
	import type { Activity } from '$lib/types/school';
	import type { Snippet } from 'svelte';
	import { page } from '$app/stores';
	import DataState from '$lib/components/ui/DataState.svelte';
	import PageQuery from '$lib/components/ui/PageQuery.svelte';
	import { detailHref } from '$lib/detail-hrefs';
	import { listRouteCacheKey } from '$lib/detail-route-patterns';
	import { t } from '$lib/i18n';
	import { readActivityListFilters } from '$lib/list/list-url-filters';
	import { detailNavigationSearch } from '$lib/navigation/detail-navigation';
	import { registerVersionInvalidation } from '$lib/navigation/invalidate-on-navigate';
	import { currentRouteSurfaceHref, openDetailDrawer } from '$lib/navigation/route-surface-navigation';
	import { releaseRoutePageQueryOnDestroy } from '$lib/queries/route-page-query-lifecycle.svelte';
	import { onDestroy, untrack } from 'svelte';
	import {
		ActivitiesPageState,
		setActivitiesPageState,
	} from './activities-page.svelte';
	import ActivitiesList from './components/ActivitiesList.svelte';

	const { children: pageChildren }: { children: Snippet } = $props();

	const activitiesPage = new ActivitiesPageState(() => $page.url);
	setActivitiesPageState(activitiesPage);
	onDestroy(() => activitiesPage.list.clear());
	registerVersionInvalidation(activitiesPage);
	releaseRoutePageQueryOnDestroy(() => $page.url);

	const query = activitiesPage.queryListPage();
	const urlFilters = $derived(readActivityListFilters($page.url));

	$effect(() => {
		const incoming = urlFilters;
		untrack(() => activitiesPage.filters.hydrate(incoming));
	});

	function selectActivity(activity: Pick<Activity, 'id'>) {
		activitiesPage.selectFromList(activity.id);
		const path = detailHref.schoolActivityTab(activity.id, 'profile');
		openDetailDrawer(`${path}${detailNavigationSearch($page.url)}`, currentRouteSurfaceHref($page.url));
	}
</script>

<PageQuery {query} cache={false} preserveWhileLoading loadingSurfaceKey={listRouteCacheKey} cacheKey={url => listRouteCacheKey(url) + activitiesPage.list.key} loadingTitle={$t('school.activities')}>
	{#snippet children(data)}
		<DataState
			preserveShell
			status={activitiesPage.list.denied ? 'denied' : data.status}
			errorMessage={data.errorMessage}
			emptyTitle={$t('school.activities')}
			emptyDescription={$t('dataState.emptyDescription')}
		>
			<ActivitiesList onSelect={selectActivity} selectedId={activitiesPage.selectedId} />
		</DataState>
	{/snippet}
</PageQuery>

{@render pageChildren()}
