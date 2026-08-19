<script lang="ts">
	import type { Snippet } from 'svelte';
	import { page } from '$app/stores';
	import DataState from '$lib/components/ui/DataState.svelte';
	import PageQuery from '$lib/components/ui/PageQuery.svelte';
	import { listRouteCacheKey } from '$lib/detail-route-patterns';
	import { t } from '$lib/i18n';
	import { setDrawerUrlModals } from '$lib/modal/drawer-url-modals.svelte';
	import { registerVersionInvalidation } from '$lib/navigation/invalidate-on-navigate';
	import { releaseRoutePageQueryOnDestroy } from '$lib/queries/route-page-query-lifecycle.svelte';
	import { PlanningState, setPlanningState } from '$lib/scheduling/planning-state.svelte';
	import TimetableList from './components/TimetableList.svelte';
	import TimetablePageHydrator from './components/TimetablePageHydrator.svelte';
	import {
		TimetablePageState,
		setTimetablePageState,
	} from './timetable-page.svelte';

	const { children: pageChildren }: { children: Snippet } = $props();

	const timetablePage = new TimetablePageState(() => $page.url, () => $page.params.classId ?? '');
	setTimetablePageState(timetablePage);
	const planning = new PlanningState(
		() => $page.url,
		() => $page.params.classId ?? '',
	);
	setPlanningState(planning);
	setDrawerUrlModals(planning.modals);
	registerVersionInvalidation(timetablePage);
	releaseRoutePageQueryOnDestroy(() => $page.url);

	const classId = $derived($page.params.classId ?? '');
	const selectedId = $derived(timetablePage.selectedId);
	const query = $derived(timetablePage.queryListPage(classId));

	$effect(() => {
		const eventsReady = timetablePage.slice?.classId === classId;
		planning.hydrateFromUrl($page.url, {
			eventIds: timetablePage.events.map(event => event.id),
			events: timetablePage.events,
			validateEventTargets: eventsReady,
			studentIds: timetablePage.students.map(student => student.id),
			validateStudentTargets: eventsReady,
		});
	});
</script>

<PageQuery {query} cacheKey={listRouteCacheKey} loadingTitle={$t('tab.timetable')}>
	{#snippet children(data)}
		<TimetablePageHydrator {data} />
		<DataState
			preserveShell
			status={data.status}
			errorMessage={data.errorMessage}
			emptyTitle={$t('tab.timetable')}
			emptyDescription={$t('dataState.emptyDescription')}
		>
			<TimetableList {classId} {selectedId} />
			{@render pageChildren()}
		</DataState>
	{/snippet}
</PageQuery>
