<script lang="ts">
	import DataState from '$lib/components/ui/DataState.svelte';
	import PageQuery from '$lib/components/ui/PageQuery.svelte';
	import { drawerTabRouteCacheKey } from '$lib/detail-route-patterns';
	import { t } from '$lib/i18n';
	import { getTimetablePageState } from '../../../timetable-page.svelte';
	import SessionAttendanceTab from './components/SessionAttendanceTab.svelte';
	import { getSessionAttendanceTabState } from './session-attendance-tab.svelte';

	const attendanceTab = getSessionAttendanceTabState();
	const query = attendanceTab.query();
	const session = $derived(getTimetablePageState().selected);
</script>

{#if session}
	<PageQuery {query} cacheKey={drawerTabRouteCacheKey} loadingTitle={$t('planning.session.attendanceTab')}>
		{#snippet children(data)}
			<DataState status={data.status} errorMessage={data.errorMessage}>
				<SessionAttendanceTab s={session} />
			</DataState>
		{/snippet}
	</PageQuery>
{/if}
