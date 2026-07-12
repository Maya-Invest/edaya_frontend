<script lang="ts">
	import DataState from '$lib/components/ui/DataState.svelte';
	import PageQuery from '$lib/components/ui/PageQuery.svelte';
	import { drawerTabRouteCacheKey } from '$lib/detail-route-patterns';
	import { t } from '$lib/i18n';
	import { getTeachersPageState } from '../../../teachers-page.svelte';
	import TeacherAssignmentsTab from './components/TeacherAssignmentsTab.svelte';
	import { getTeacherAssignmentsTabState } from './teacher-assignments-tab.svelte';

	const assignmentsTab = getTeacherAssignmentsTabState();
	const query = assignmentsTab.query();
	const teacher = $derived(getTeachersPageState().selected);
</script>

{#if teacher}
	<PageQuery {query} cacheKey={drawerTabRouteCacheKey} loadingTitle={$t('drawer.tab.assignments')}>
		{#snippet children(data)}
			<DataState status={data.status} errorMessage={data.errorMessage}>
				<TeacherAssignmentsTab {teacher} />
			</DataState>
		{/snippet}
	</PageQuery>
{/if}
