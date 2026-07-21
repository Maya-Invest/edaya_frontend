<script lang="ts">
	import DataState from '$lib/components/ui/DataState.svelte';
	import PageQuery from '$lib/components/ui/PageQuery.svelte';
	import { drawerTabRouteCacheKey } from '$lib/detail-route-patterns';
	import { t } from '$lib/i18n';
	import { getAttendancePageState } from '../attendance-page.svelte';
	import { getAttendanceDayDetailState } from './attendance-day-detail.svelte';
	import AttendanceDayDetail from './components/AttendanceDayDetail.svelte';

	const attendancePage = getAttendancePageState();
	const detailState = getAttendanceDayDetailState();
	const query = detailState.query();
	const day = $derived(attendancePage.selected);
</script>

{#if day}
	<PageQuery {query} cacheKey={drawerTabRouteCacheKey} loadingTitle={$t('attendanceDay.drawerLabel')}>
		{#snippet children(data)}
			<DataState status={data.status} errorMessage={data.errorMessage}>
				<AttendanceDayDetail {day} />
			</DataState>
		{/snippet}
	</PageQuery>
{/if}
