<script lang="ts">
	import type { StaffPermissionAssignmentView } from '$lib/api/staff-permission-assignments-data';
	import { page } from '$app/stores';
	import DataState from '$lib/components/ui/DataState.svelte';
	import PageQuery from '$lib/components/ui/PageQuery.svelte';
	import { drawerTabRouteCacheKey } from '$lib/detail-route-patterns';
	import { t } from '$lib/i18n';
	import { setDrawerUrlModals } from '$lib/modal/drawer-url-modals.svelte';
	import { bindUrlModal, createUrlSyncedModals } from '$lib/modal/modal-state.svelte';
	import { getStaffPageState } from '../../../staff-page.svelte';
	import StaffPermissionFormModal from './components/StaffPermissionFormModal.svelte';
	import StaffPermissionsTab from './components/StaffPermissionsTab.svelte';
	import { getStaffPermissionsTabState } from './staff-permissions-tab.svelte';

	const permissionsTab = getStaffPermissionsTabState();
	const query = permissionsTab.query();
	const staff = $derived(getStaffPageState().selected);

	const modals = createUrlSyncedModals({ allowed: ['add-permission'], getUrl: () => $page.url });
	setDrawerUrlModals(modals);
	$effect(() => {
		modals.hydrate();
	});
	const addPermissionOpen = bindUrlModal(modals, 'add-permission');

	let permissionEditing = $state<StaffPermissionAssignmentView | null>(null);

	$effect(() => {
		if (!addPermissionOpen.open) {
			permissionEditing = null;
		}
	});
</script>

{#if staff}
	<PageQuery {query} cacheKey={drawerTabRouteCacheKey} loadingTitle={$t('drawer.tab.permissions')}>
		{#snippet children(data)}
			<DataState status={data.status} errorMessage={data.errorMessage}>
				<StaffPermissionsTab
					s={staff}
					bind:editing={permissionEditing}
					bind:addPermissionOpen={addPermissionOpen.open}
				/>

				<StaffPermissionFormModal
					bind:open={addPermissionOpen.open}
					staff={staff}
					assignment={permissionEditing}
				/>
			</DataState>
		{/snippet}
	</PageQuery>
{/if}
