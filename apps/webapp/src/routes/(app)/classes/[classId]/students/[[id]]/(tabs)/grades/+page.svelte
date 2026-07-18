<script lang="ts">
	import DataState from '$lib/components/ui/DataState.svelte';
	import PageQuery from '$lib/components/ui/PageQuery.svelte';
	import { drawerTabRouteCacheKey } from '$lib/detail-route-patterns';
	import { t } from '$lib/i18n';
	import StudentGradesTab from '../../../../../../school/students/[[id]]/(tabs)/grades/components/StudentGradesTab.svelte';
	import { getStudentGradesTabState } from '../../../../../../school/students/[[id]]/(tabs)/grades/student-grades-tab.svelte';
	import { getClassStudentsPageState } from '../../../class-students-page.svelte';

	const gradesTab = getStudentGradesTabState();
	const query = gradesTab.query();
	const student = $derived(getClassStudentsPageState().selected);
</script>

{#if student}
	<PageQuery {query} cacheKey={drawerTabRouteCacheKey} loadingTitle={$t('drawer.tab.grades')}>
		{#snippet children(data)}
			<DataState status={data.status} errorMessage={data.errorMessage}>
				<StudentGradesTab s={student} />
			</DataState>
		{/snippet}
	</PageQuery>
{/if}
