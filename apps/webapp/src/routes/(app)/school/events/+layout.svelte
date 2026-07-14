<script lang="ts">
	import type { Incident } from '$lib/types/school';
	import type { Snippet } from 'svelte';
	import { page } from '$app/stores';
	import DataState from '$lib/components/ui/DataState.svelte';
	import PageQuery from '$lib/components/ui/PageQuery.svelte';
	import { detailHref } from '$lib/detail-hrefs';
	import { t } from '$lib/i18n';
	import { appGoto } from '$lib/navigation/app-navigation';
	import { detailNavigationSearch } from '$lib/navigation/detail-navigation';
	import { registerVersionInvalidation } from '$lib/navigation/invalidate-on-navigate';
	import { releaseRoutePageQueryOnDestroy } from '$lib/queries/route-page-query-lifecycle.svelte';
	import EventsList from './components/EventsList.svelte';
	import { EventsPageState, setEventsPageState } from './events-page.svelte';

	const { children: pageChildren }: { children: Snippet } = $props();

	const eventsPage = new EventsPageState(() => $page.url);
	setEventsPageState(eventsPage);
	registerVersionInvalidation(eventsPage);
	releaseRoutePageQueryOnDestroy(() => $page.url);

	const query = eventsPage.queryListPage();

	function selectIncident(incident: Incident) {
		const path = detailHref.schoolIncident(incident.id);
		appGoto(`${path}${detailNavigationSearch($page.url)}`);
	}
</script>

<PageQuery {query} loadingTitle={$t('school.events')}>
	{#snippet children(data)}
		<DataState
			preserveShell
			status={data.status}
			errorMessage={data.errorMessage}
			emptyTitle={$t('school.events')}
			emptyDescription={$t('dataState.emptyDescription')}
		>
			<EventsList onSelect={selectIncident} selectedId={eventsPage.selectedId} />
			{@render pageChildren()}
		</DataState>
	{/snippet}
</PageQuery>
