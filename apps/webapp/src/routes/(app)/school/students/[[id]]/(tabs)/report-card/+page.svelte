<script lang="ts">
	import AcademicPeriodSelector from '$lib/components/layout/AcademicPeriodSelector.svelte';
	import DataState from '$lib/components/ui/DataState.svelte';
	import PageQuery from '$lib/components/ui/PageQuery.svelte';
	import { drawerTabRouteCacheKey } from '$lib/detail-route-patterns';
	import { t } from '$lib/i18n';
	import { getStudentsPageState } from '../../../students-page.svelte';
	import { getStudentReportCardTabState } from './student-report-card-tab.svelte';
	import StudentReportCardPanel from './StudentReportCardPanel.svelte';

	const reportCardTab = getStudentReportCardTabState();
	const query = reportCardTab.query();
	const student = $derived(getStudentsPageState().selected);
</script>

{#if student}
	<div class="mb-4"><AcademicPeriodSelector /></div>
	<PageQuery {query} cacheKey={drawerTabRouteCacheKey} loadingTitle={$t('drawer.tab.reportCard')}>
		{#snippet children(data)}
			<DataState status={data.status} errorMessage={data.errorMessage}>
				<StudentReportCardPanel s={student} />
			</DataState>
		{/snippet}
	</PageQuery>
{/if}
