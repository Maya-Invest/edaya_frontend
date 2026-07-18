<script lang="ts">
	import DataState from '$lib/components/ui/DataState.svelte';
	import PageQuery from '$lib/components/ui/PageQuery.svelte';
	import { drawerTabRouteCacheKey } from '$lib/detail-route-patterns';
	import { t } from '$lib/i18n';
	import { getStudentReportCardTabState } from '../../../../../../school/students/[[id]]/(tabs)/report-card/student-report-card-tab.svelte';
	import StudentReportCardPanel from '../../../../../../school/students/[[id]]/(tabs)/report-card/StudentReportCardPanel.svelte';
	import { getClassStudentsPageState } from '../../../class-students-page.svelte';

	const reportCardTab = getStudentReportCardTabState();
	const query = reportCardTab.query();
	const student = $derived(getClassStudentsPageState().selected);
</script>

{#if student}
	<PageQuery {query} cacheKey={drawerTabRouteCacheKey} loadingTitle={$t('drawer.tab.reportCard')}>
		{#snippet children(data)}
			<DataState status={data.status} errorMessage={data.errorMessage}>
				<StudentReportCardPanel s={student} />
			</DataState>
		{/snippet}
	</PageQuery>
{/if}
