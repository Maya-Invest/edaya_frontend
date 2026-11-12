<script lang="ts">
	import type { Student } from '$lib/types/school';
	import DataState from '$lib/components/ui/DataState.svelte';
	import PageQuery from '$lib/components/ui/PageQuery.svelte';
	import { t } from '$lib/i18n';
	import { registerVersionInvalidation } from '$lib/navigation/invalidate-on-navigate';
	import { getStudentReportCardTabState } from './student-report-card-tab.svelte';
	import StudentReportCardPanel from './StudentReportCardPanel.svelte';

	const { student }: { student: Student } = $props();
	const state = getStudentReportCardTabState();
	registerVersionInvalidation(state);
	const query = state.query();
</script>

<PageQuery {query} cacheKey={state.cacheKey} cache={false} loadingTitle={$t('drawer.tab.reportCard')}>
	<DataState {...state.statusFor(student.id)}>
		<StudentReportCardPanel s={student} />
	</DataState>
</PageQuery>
