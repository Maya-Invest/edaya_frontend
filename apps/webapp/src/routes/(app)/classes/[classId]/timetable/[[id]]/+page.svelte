<script lang="ts">
	import type { PlanningEvent } from '$lib/types/school';
	import { page } from '$app/stores';
	import PlanningView from '$lib/components/school/scheduling/PlanningView.svelte';
	import { detailHref } from '$lib/detail-hrefs';
	import { appGoto } from '$lib/navigation/app-navigation';
	import { detailNavigationSearch } from '$lib/navigation/detail-navigation';
	import TimetableGenerationToolbar from './components/TimetableGenerationToolbar.svelte';
	import { getTimetablePageState } from '../timetable-page.svelte';

	const selectedId = $derived($page.params.id);
	const timetablePage = getTimetablePageState();

	function selectSession(ev: PlanningEvent) {
		const path = detailHref.classPlanning(timetablePage.classId, ev.id);
		const href = `${path}${detailNavigationSearch($page.url)}`;
		if ($page.url.pathname === path) {
			return;
		}
		appGoto(href);
	}
</script>

<TimetableGenerationToolbar state={timetablePage} />
<PlanningView
	classId={timetablePage.classId}
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
