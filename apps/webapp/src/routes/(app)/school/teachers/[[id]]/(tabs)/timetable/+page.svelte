<script lang="ts">
	import DataState from '$lib/components/ui/DataState.svelte';
	import PageQuery from '$lib/components/ui/PageQuery.svelte';
	import { drawerTabRouteCacheKey } from '$lib/detail-route-patterns';
	import { t } from '$lib/i18n';
	import { getTeachersPageState } from '../../../teachers-page.svelte';
	import TeacherTimetableTab from './components/TeacherTimetableTab.svelte';
	import { getTeacherTimetableTabState } from './teacher-timetable-tab.svelte';

	const timetableTab = getTeacherTimetableTabState();
	const query = timetableTab.query();
	const teacher = $derived(getTeachersPageState().selected);
	const cacheKey = $derived((url: URL) => `${drawerTabRouteCacheKey(url)}:${url.searchParams.get('week') ?? ''}`);
</script>

{#if teacher}
	<PageQuery {query} cacheKey={cacheKey} loadingTitle={$t('drawer.tab.timetable')}>
		{#snippet children(data)}
			<DataState status={data.status} errorMessage={data.errorMessage}>
				<TeacherTimetableTab {teacher} />
			</DataState>
		{/snippet}
	</PageQuery>
{/if}
