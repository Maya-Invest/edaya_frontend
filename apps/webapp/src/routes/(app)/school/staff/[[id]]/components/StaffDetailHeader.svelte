<script lang="ts">
	import type { StaffMember } from '$lib/types/school';
	import { page } from '$app/stores';
	import AccountLinkingSection from '$lib/components/account/AccountLinkingSection.svelte';
	import DrawerEntityHeader from '$lib/components/school/shared/DrawerEntityHeader.svelte';
	import PersonAvatar from '$lib/components/school/shared/PersonAvatar.svelte';
	import ProfilePhotoPicker from '$lib/components/school/shared/ProfilePhotoPicker.svelte';
	import ConfirmModal from '$lib/components/ui/ConfirmModal.svelte';
	import PermissionGate from '$lib/components/ui/PermissionGate.svelte';
	import RowActionMenuItem from '$lib/components/ui/RowActionMenuItem.svelte';
	import { detailHref } from '$lib/detail-hrefs';
	import { t } from '$lib/i18n';
	import { setDrawerUrlModals } from '$lib/modal/drawer-url-modals.svelte';
	import { bindUrlModal, createUrlSyncedModals } from '$lib/modal/modal-state.svelte';
	import { canUploadProfilePhoto } from '$lib/permissions';
	import { get } from 'svelte/store';
	import { getStaffPageState } from '../../staff-page.svelte';
	import StaffProfileEditModal from './StaffProfileEditModal.svelte';

	const {
		staff,
		onDeleted,
	}: {
		staff: StaffMember;
		onDeleted?: () => void;
	} = $props();

	const staffPage = getStaffPageState();

	const modals = createUrlSyncedModals({ allowed: ['edit-profile'], getUrl: () => $page.url });
	setDrawerUrlModals(modals);
	$effect(() => {
		modals.hydrate();
	});
	const editProfileOpen = bindUrlModal(modals, 'edit-profile');

	const canChangePhoto = $derived(canUploadProfilePhoto('STAFF_UPDATE'));
	let deleteOpen = $state(false);
	let deleteBusy = $state(false);

	const permissionsHref = $derived(detailHref.schoolStaffTab(staff.id, 'permissions'));

	async function handlePhotoChange(file: File) {
		return staffPage.updateProfilePhoto({
			staffId: staff.id,
			file,
			successMessage: get(t)('profilePhoto.updateSuccess'),
		});
	}

	async function confirmDelete() {
		deleteBusy = true;
		try {
			const ok = await staffPage.deleteStaff(staff.id, {
				successMessage: get(t)('staff.toastDeleted', { name: staff.name }),
			});
			if (ok) {
				deleteOpen = false;
				onDeleted?.();
			}
		}
		finally {
			deleteBusy = false;
		}
	}
</script>

<DrawerEntityHeader
	name={staff.name}
	summary={`${$t(`staff.role.${staff.role}`)} · ${staff.department}`}
>
	{#snippet avatar()}
		{#if canChangePhoto}
			<ProfilePhotoPicker
				name={staff.name}
				initials={staff.initials}
				photoUrl={staff.photoUrl}
				size="lg"
				onChange={handlePhotoChange}
			/>
		{:else}
			<PersonAvatar name={staff.name} initials={staff.initials} photoUrl={staff.photoUrl} size="lg" />
		{/if}
	{/snippet}
	{#snippet actions()}
		<PermissionGate permission="STAFF_UPDATE" mode="disable" tooltip={$t('staff.permissionUpdate')}>
			{#snippet children({ disabled, title })}
				<StaffProfileEditModal s={staff} {disabled} {title} bind:open={editProfileOpen.open} />
			{/snippet}
		</PermissionGate>
		<PermissionGate permission="ACCESS_CONTROL_ASSIGN" mode="disable" tooltip={$t('staff.permissionAssign')}>
			{#snippet children({ disabled, title })}
				<a
					href={permissionsHref}
					class="inline-flex h-9 items-center rounded-full border border-input bg-background px-4 text-sm font-medium transition hover:bg-secondary aria-disabled:pointer-events-none aria-disabled:opacity-50"
					aria-disabled={disabled}
					{title}
				>
					{$t('staff.managePermissions')}
				</a>
			{/snippet}
		</PermissionGate>
	{/snippet}
	{#snippet overflow()}
		<PermissionGate permission="STAFF_UPDATE" mode="disable" tooltip={$t('staff.permissionUpdate')}>
			{#snippet children({ disabled, title })}
				<RowActionMenuItem
					{disabled}
					{title}
					destructive
					onclick={() => (deleteOpen = true)}
				>
					{$t('common.delete')}
				</RowActionMenuItem>
			{/snippet}
		</PermissionGate>
	{/snippet}
</DrawerEntityHeader>

<ConfirmModal
	bind:open={deleteOpen}
	title={$t('common.deleteConfirmTitle')}
	description={$t('staff.deleteConfirm', { name: staff.name })}
	confirmLabel={$t('common.delete')}
	busy={deleteBusy}
	onConfirm={confirmDelete}
/>
