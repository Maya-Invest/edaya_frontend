<script lang="ts">
	import type { PlanningEvent } from '$lib/types/school';
	import { page } from '$app/stores';
	import PlanningView from '$lib/components/school/scheduling/PlanningView.svelte';
	import DataState from '$lib/components/ui/DataState.svelte';
	import PageQuery from '$lib/components/ui/PageQuery.svelte';
	import { listRouteCacheKey } from '$lib/detail-route-patterns';
	import { detailHref } from '$lib/detail-hrefs';
	import { t } from '$lib/i18n';
	import { appGoto } from '$lib/navigation/app-navigation';
	import { detailNavigationSearch } from '$lib/navigation/detail-navigation';
	import { queryClassTimetablePage } from '$lib/queries/planning.queries';
	import TimetableGenerationToolbar from './components/TimetableGenerationToolbar.svelte';
	import { getTimetablePageState } from './timetable-page.svelte';

	const selectedId = $derived($page.params.id);
	const timetablePage = getTimetablePageState();
	const query = $derived(queryClassTimetablePage(timetablePage.classId, {
		seedData: data => timetablePage.seedData(data),
		loadTeacherConstraints: () => timetablePage.loadTeacherConstraints(),
	}));

	function selectSession(ev: PlanningEvent) {
		const path = detailHref.classPlanning(timetablePage.classId, ev.id);
		const href = `${path}${detailNavigationSearch($page.url)}`;
		if ($page.url.pathname === path) {
			return;
		}
		appGoto(href);
	}
</script>

<PageQuery {query} cacheKey={listRouteCacheKey} loadingTitle={$t('tab.timetable')}>
	{#snippet children(data)}
		<DataState
			preserveShell
			status={data.status}
			errorMessage={data.errorMessage}
			emptyTitle={$t('tab.timetable')}
			emptyDescription={$t('dataState.emptyDescription')}
		>
			<TimetableGenerationToolbar state={timetablePage} />
			<PlanningView
				classId={data.classId}
				events={timetablePage.events}
				students={timetablePage.students}
				subjects={timetablePage.subjects}
				activities={timetablePage.activities}
				focusDate={timetablePage.focusDate}
				onRefresh={() => timetablePage.refresh()}
				onSelect={selectSession}
				{selectedId}
			/>
		</DataState>
	{/snippet}
</PageQuery>
