<script lang="ts">
	import DataState from '$lib/components/ui/DataState.svelte';
	import PageQuery from '$lib/components/ui/PageQuery.svelte';
	import { drawerTabRouteCacheKey } from '$lib/detail-route-patterns';
	import { t } from '$lib/i18n';
	import { getStudentsPageState } from '../../../students-page.svelte';
	import StudentIncidentsTab from './components/StudentIncidentsTab.svelte';
	import { getStudentIncidentsTabState } from './student-incidents-tab.svelte';

	const incidentsTab = getStudentIncidentsTabState();
	const query = incidentsTab.query();
	const student = $derived(getStudentsPageState().selected);
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
