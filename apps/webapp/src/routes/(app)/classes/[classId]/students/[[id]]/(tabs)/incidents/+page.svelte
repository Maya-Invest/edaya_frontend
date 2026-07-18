<script lang="ts">
	import DataState from '$lib/components/ui/DataState.svelte';
	import PageQuery from '$lib/components/ui/PageQuery.svelte';
	import { drawerTabRouteCacheKey } from '$lib/detail-route-patterns';
	import { t } from '$lib/i18n';
	import StudentIncidentsTab from '../../../../../../school/students/[[id]]/(tabs)/incidents/components/StudentIncidentsTab.svelte';
	import { getStudentIncidentsTabState } from '../../../../../../school/students/[[id]]/(tabs)/incidents/student-incidents-tab.svelte';
	import { getClassStudentsPageState } from '../../../class-students-page.svelte';

	const incidentsTab = getStudentIncidentsTabState();
	const query = incidentsTab.query();
	const student = $derived(getClassStudentsPageState().selected);
</script>

{#if student}
	<PageQuery {query} cacheKey={drawerTabRouteCacheKey} loadingTitle={$t('drawer.tab.incidents')}>
		{#snippet children(data)}
			<DataState status={data.status} errorMessage={data.errorMessage}>
				<StudentIncidentsTab s={student} />
			</DataState>
		{/snippet}
	</PageQuery>
{/if}
