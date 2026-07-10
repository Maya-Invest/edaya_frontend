<script lang="ts">
	import DataState from '$lib/components/ui/DataState.svelte';
	import PageQuery from '$lib/components/ui/PageQuery.svelte';
	import { drawerTabRouteCacheKey } from '$lib/detail-route-patterns';
	import { t } from '$lib/i18n';
	import StudentAttendanceTab from '../../components/StudentAttendanceTab.svelte';
	import { queryStudentAttendanceTab } from '../../students-detail.queries';
	import { getStudentsPageState } from '../../students-page.svelte';

	const studentsPage = getStudentsPageState();
	const query = queryStudentAttendanceTab(studentsPage);
	const student = $derived(studentsPage.selected);
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
