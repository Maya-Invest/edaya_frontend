<script lang="ts">
	import DataState from '$lib/components/ui/DataState.svelte';
	import PageQuery from '$lib/components/ui/PageQuery.svelte';
	import { drawerTabRouteCacheKey } from '$lib/detail-route-patterns';
	import { t } from '$lib/i18n';
	import { getStaffPageState } from '../../../staff-page.svelte';
	import StaffAssignmentsTab from './components/StaffAssignmentsTab.svelte';
	import { getStaffAssignmentsTabState } from './staff-assignments-tab.svelte';

	const assignmentsTab = getStaffAssignmentsTabState();
	const query = assignmentsTab.query();
	const staff = $derived(getStaffPageState().selected);
</script>

{#if staff}
	<PageQuery {query} cacheKey={drawerTabRouteCacheKey} loadingTitle={$t('drawer.tab.assignments')}>
		{#snippet children(data)}
			<DataState status={data.status} errorMessage={data.errorMessage}>
				<StaffAssignmentsTab s={staff} />
			</DataState>
		{/snippet}
	</PageQuery>
{/if}
