<script lang="ts">
	import DataState from '$lib/components/ui/DataState.svelte';
	import PageQuery from '$lib/components/ui/PageQuery.svelte';
	import { drawerTabRouteCacheKey } from '$lib/detail-route-patterns';
	import { t } from '$lib/i18n';
	import { getClassesPageState } from '../../../classes-page.svelte';
	import ClassGroupStaffAssignmentsSection from '../../../components/ClassGroupStaffAssignmentsSection.svelte';
	import { getClassGroupAssignmentsTabState } from './class-group-assignments-tab.svelte';

	const assignmentsTab = getClassGroupAssignmentsTabState();
	const query = assignmentsTab.query();
	const classGroup = $derived(getClassesPageState().selected);
</script>

{#if classGroup}
	<PageQuery {query} cacheKey={drawerTabRouteCacheKey} loadingTitle={$t('classGroups.assignmentsTab')}>
		{#snippet children(data)}
			<DataState status={data.status} errorMessage={data.errorMessage}>
				<ClassGroupStaffAssignmentsSection {classGroup} />
			</DataState>
		{/snippet}
	</PageQuery>
{/if}
