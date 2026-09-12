<script lang="ts">
	import { page } from '$app/stores';
	import { formatPermissionLabel } from '$lib/api/staff-permission-assignments-data';
	import ConfirmModal from '$lib/components/ui/ConfirmModal.svelte';
	import DataState from '$lib/components/ui/DataState.svelte';
	import PageQuery from '$lib/components/ui/PageQuery.svelte';
	import { drawerTabRouteCacheKey } from '$lib/detail-route-patterns';
	import { t } from '$lib/i18n';
	import { setDrawerUrlModals } from '$lib/modal/drawer-url-modals.svelte';
	import { bindUrlModal, createUrlSyncedModals } from '$lib/modal/modal-state.svelte';
	import { get } from 'svelte/store';
	import { getStaffPageState } from '../../../staff-page.svelte';
	import StaffPermissionFormModal from './components/StaffPermissionFormModal.svelte';
	import StaffPermissionsTab from './components/StaffPermissionsTab.svelte';
	import { getStaffPermissionsTabState } from './staff-permissions-tab.svelte';

	const permissionsTab = getStaffPermissionsTabState();
	const loadPermissions = permissionsTab.query();
	const staffPage = getStaffPageState();
	const staff = $derived(staffPage.selected);

	const modals = createUrlSyncedModals({
		allowed: ['add-permission', 'delete-permission'],
		getUrl: () => $page.url,
	});
	setDrawerUrlModals(modals);
	$effect(() => {
		modals.hydrate();
	});
	const addPermissionOpen = bindUrlModal(modals, 'add-permission');
	const deletePermissionOpen = bindUrlModal(modals, 'delete-permission');

	let deleteBusy = $state(false);

	const permissionRows = $derived(
		staff ? staffPage.permissionAssignmentsForStaff(staff.id) : [],
	);
	const permissionDataKey = $derived.by(() => {
		const scope = staffPage.staffScope();
		return scope.schoolId && scope.academicYearId
			? `${scope.schoolId}:${scope.academicYearId}`
			: '';
	});
	const permissionsReady = $derived(
		permissionDataKey !== '' && permissionsTab.isReady(permissionDataKey),
	);
	const permissionEditing = $derived(
		modals.isOpen('add-permission') && modals.target
			? permissionRows.find(row => row.id === modals.target) ?? null
			: null,
	);
	const permissionDeleting = $derived(
		modals.isOpen('delete-permission') && modals.target
			? permissionRows.find(row => row.id === modals.target) ?? null
			: null,
	);

	function validateModalTarget() {
		if (!modals.ready || !permissionsReady || !modals.active) {
			return;
		}
		if (
			(modals.active === 'add-permission' && modals.target !== null && !permissionEditing)
			|| (modals.active === 'delete-permission' && !permissionDeleting)
		) {
			modals.close();
		}
	}

	$effect(() => {
		validateModalTarget();
	});

	async function query(url: URL) {
		const result = await loadPermissions(url);
		validateModalTarget();
		return result;
	}

	async function confirmDeletePermission() {
		if (!staff || !permissionDeleting || deleteBusy) {
			return;
		}
		deleteBusy = true;
		try {
			const ok = await staffPage.deletePermission({
				assignmentId: permissionDeleting.id,
				staffId: staff.id,
				successMessage: get(t)('roles.permissionDeleted', {
					permission: formatPermissionLabel(permissionDeleting.permission, get(t)),
				}),
			});
			if (ok) {
				modals.close();
			}
		}
		finally {
			deleteBusy = false;
		}
	}
</script>

{#if staff}
	<PageQuery {query} cacheKey={drawerTabRouteCacheKey} loadingTitle={$t('drawer.tab.permissions')}>
		{#snippet children(data)}
			<DataState status={data.status} errorMessage={data.errorMessage}>
				<StaffPermissionsTab
					s={staff}
					onCreate={() => modals.open('add-permission')}
					onEdit={row => modals.open('add-permission', { target: row.id })}
					onDelete={row => modals.open('delete-permission', { target: row.id })}
				/>
			</DataState>
		{/snippet}
	</PageQuery>

	<StaffPermissionFormModal
		bind:open={addPermissionOpen.open}
		staff={staff}
		assignment={permissionEditing}
	/>

	<ConfirmModal
		bind:open={deletePermissionOpen.open}
		title={$t('common.deleteConfirmTitle')}
		confirmLabel={$t('common.delete')}
		cancelLabel={$t('common.cancel')}
		busy={deleteBusy}
		onConfirm={confirmDeletePermission}
	/>
{/if}
