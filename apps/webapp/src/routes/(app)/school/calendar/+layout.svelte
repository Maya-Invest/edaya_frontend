<script lang="ts">
	import type { Snippet } from 'svelte';
	import { page } from '$app/stores';
	import DataState from '$lib/components/ui/DataState.svelte';
	import PageQuery from '$lib/components/ui/PageQuery.svelte';
	import { t } from '$lib/i18n';
	import { readCalendarListFilters } from '$lib/list/list-url-filters';
	import { registerVersionInvalidation } from '$lib/navigation/invalidate-on-navigate';
	import { releaseRoutePageQueryOnDestroy } from '$lib/queries/route-page-query-lifecycle.svelte';
	import {
		CalendarPageState,
		setCalendarPageState,
	} from './calendar-page.svelte';
	import CalendarList from './components/CalendarList.svelte';

	const { children: pageChildren }: { children: Snippet } = $props();

	const calendarPage = new CalendarPageState(() => $page.url);
	setCalendarPageState(calendarPage);
	registerVersionInvalidation(calendarPage);
	releaseRoutePageQueryOnDestroy(() => $page.url);

	const query = calendarPage.queryListPage();
	const urlFilters = $derived(readCalendarListFilters($page.url));

	$effect(() => {
		calendarPage.filters.hydrate(urlFilters);
	});
</script>

<PageQuery {query} loadingTitle={$t('school.calendar')}>
	{#snippet children(data)}
		<DataState
			preserveShell
			status={data.status}
			errorMessage={data.errorMessage}
			emptyTitle={$t('school.calendar')}
			emptyDescription={$t('dataState.emptyDescription')}
		>
			<CalendarList />
			{@render pageChildren()}
		</DataState>
	{/snippet}
</PageQuery>
