<script lang="ts">
	import { page } from '$app/stores';
	import AttendanceView from '$lib/components/school/attendance/AttendanceView.svelte';
	import DataState from '$lib/components/ui/DataState.svelte';
	import PageQuery from '$lib/components/ui/PageQuery.svelte';
	import { detailHref } from '$lib/detail-hrefs';
	import { t } from '$lib/i18n';
	import { appGoto } from '$lib/navigation/app-navigation';
	import { queryClassAttendancePage } from '$lib/queries/attendance.queries';

	const selectedId = $derived($page.params.id);
	const classId = $derived($page.params.classId ?? '6a');
	const query = $derived(queryClassAttendancePage(classId));
</script>

<PageQuery {query} loadingTitle={$t('tab.attendance')}>
	{#snippet children(data)}
		<DataState
			preserveShell
			status={data.status}
			errorMessage={data.errorMessage}
			emptyTitle={$t('tab.attendance')}
			emptyDescription={$t('dataState.emptyDescription')}
		>
			<AttendanceView
				classId={data.classId}
				onSelect={day => appGoto(detailHref.classAttendanceDay(data.classId, day.id))}
				{selectedId}
			/>
		</DataState>
	{/snippet}
</PageQuery>
