<script lang="ts">
	import DataState from '$lib/components/ui/DataState.svelte';
	import PageQuery from '$lib/components/ui/PageQuery.svelte';
	import { drawerTabRouteCacheKey } from '$lib/detail-route-patterns';
	import { t } from '$lib/i18n';
	import StudentAttendanceTab from '../../../../../../school/students/[[id]]/(tabs)/attendance/components/StudentAttendanceTab.svelte';
	import { getStudentAttendanceTabState } from '../../../../../../school/students/[[id]]/(tabs)/attendance/student-attendance-tab.svelte';
	import { getClassStudentsPageState } from '../../../class-students-page.svelte';

	const attendanceTab = getStudentAttendanceTabState();
	const query = attendanceTab.query();
	const student = $derived(getClassStudentsPageState().selected);
</script>

{#if student}
	<PageQuery {query} cacheKey={drawerTabRouteCacheKey} loadingTitle={$t('drawer.tab.attendance')}>
		{#snippet children(data)}
			<DataState status={data.status} errorMessage={data.errorMessage}>
				<StudentAttendanceTab s={student} />
			</DataState>
		{/snippet}
	</PageQuery>
{/if}
