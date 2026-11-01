<script lang="ts">
	import DataState from '$lib/components/ui/DataState.svelte';
	import PageQuery from '$lib/components/ui/PageQuery.svelte';
	import { drawerTabRouteCacheKey } from '$lib/detail-route-patterns';
	import { t } from '$lib/i18n';
	import { registerVersionInvalidation } from '$lib/navigation/invalidate-on-navigate';
	import { getTeachersPageState } from '../../../teachers-page.svelte';
	import TeacherTimetableTab from './components/TeacherTimetableTab.svelte';
	import { getTeacherTimetableTabState } from './teacher-timetable-tab.svelte';

	const timetableTab = getTeacherTimetableTabState();
	registerVersionInvalidation(timetableTab);
	const query = timetableTab.query();
	const teacher = $derived(getTeachersPageState().selected);
</script>

{#if teacher}
	<PageQuery {query} cacheKey={drawerTabRouteCacheKey} loadingTitle={$t('drawer.tab.timetable')}>
		{#snippet children(data)}
			<DataState status={data.status} errorMessage={data.errorMessage}>
				<TeacherTimetableTab {teacher} />
			</DataState>
		{/snippet}
	</PageQuery>
{/if}
