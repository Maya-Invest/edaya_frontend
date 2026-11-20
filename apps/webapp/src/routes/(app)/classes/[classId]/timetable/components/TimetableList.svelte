<script lang="ts">
	import type { PlanningEvent } from '$lib/types/school';
	import { page } from '$app/stores';
	import { detailHref } from '$lib/detail-hrefs';
	import { detailNavigationSearch } from '$lib/navigation/detail-navigation';
	import { currentRouteSurfaceHref, openDetailDrawer } from '$lib/navigation/route-surface-navigation';
	import { getTimetablePageState } from '../timetable-page.svelte';
	import TimetablePlanningView from './TimetablePlanningView.svelte';

	const {
		classId,
		selectedId,
	}: {
		classId: string;
		selectedId?: string;
	} = $props();

	const timetablePage = getTimetablePageState();

	function selectSession(ev: PlanningEvent) {
		const path = detailHref.classPlanningTab(classId, ev.id, 'details');
		const href = `${path}${detailNavigationSearch($page.url)}`;
		if ($page.url.pathname === path) {
			return;
		}
		openDetailDrawer(href, currentRouteSurfaceHref($page.url));
	}
</script>

<TimetablePlanningView
	expandCalendar
	{classId}
	events={timetablePage.events}
	students={timetablePage.students}
	subjects={timetablePage.subjects}
	activities={timetablePage.activities}
	schoolYearEvents={timetablePage.schoolYearEvents}
	focusDate={timetablePage.focusDate}
	onRefresh={() => timetablePage.refresh()}
	onSelect={selectSession}
	{selectedId}
/>
