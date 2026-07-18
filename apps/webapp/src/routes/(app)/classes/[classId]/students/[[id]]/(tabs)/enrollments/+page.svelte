<script lang="ts">
	import DataState from '$lib/components/ui/DataState.svelte';
	import PageQuery from '$lib/components/ui/PageQuery.svelte';
	import { drawerTabRouteCacheKey } from '$lib/detail-route-patterns';
	import { t } from '$lib/i18n';
	import { getStudentEnrollmentsTabState } from '../../../../../../school/students/[[id]]/(tabs)/enrollments/student-enrollments-tab.svelte';
	import StudentEnrollmentsTab from '../../../../../../school/students/[[id]]/(tabs)/enrollments/StudentEnrollmentsTab.svelte';
	import { getClassStudentsPageState } from '../../../class-students-page.svelte';

	const enrollmentsTab = getStudentEnrollmentsTabState();
	const query = enrollmentsTab.query();
	const student = $derived(getClassStudentsPageState().selected);
</script>

{#if student}
	<PageQuery {query} cacheKey={drawerTabRouteCacheKey} loadingTitle={$t('drawer.tab.enrollments')}>
		{#snippet children(data)}
			<DataState status={data.status} errorMessage={data.errorMessage}>
				<StudentEnrollmentsTab s={student} />
			</DataState>
		{/snippet}
	</PageQuery>
{/if}
