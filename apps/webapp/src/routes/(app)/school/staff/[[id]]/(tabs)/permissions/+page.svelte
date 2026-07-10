<script lang="ts">
	import type { StaffPermissionAssignmentView } from '$lib/api/staff-permission-assignments-data';
	import { page } from '$app/stores';
	import { setDrawerUrlModals } from '$lib/modal/drawer-url-modals.svelte';
	import { bindUrlModal, createUrlSyncedModals } from '$lib/modal/modal-state.svelte';
	import { getStaffPageState } from '../../../staff-page.svelte';
	import StaffPermissionFormModal from './components/StaffPermissionFormModal.svelte';
	import StaffPermissionsTab from './components/StaffPermissionsTab.svelte';

	const staffPage = getStaffPageState();
	const staff = $derived(staffPage.selected);

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
{/if}
