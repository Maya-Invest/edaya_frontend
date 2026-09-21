<script lang="ts">
	import type { Teacher } from '$lib/types/school';
	import { afterNavigate } from '$app/navigation';
	import { page } from '$app/stores';
	import DrawerEntityHeader from '$lib/components/school/shared/DrawerEntityHeader.svelte';
	import PersonAvatar from '$lib/components/school/shared/PersonAvatar.svelte';
	import ProfilePhotoPicker from '$lib/components/school/shared/ProfilePhotoPicker.svelte';
	import ConfirmModal from '$lib/components/ui/ConfirmModal.svelte';
	import PermissionGate from '$lib/components/ui/PermissionGate.svelte';
	import RowActionMenuItem from '$lib/components/ui/RowActionMenuItem.svelte';
	import { t } from '$lib/i18n';
	import { setDrawerUrlModals } from '$lib/modal/drawer-url-modals.svelte';
	import { bindUrlModal, createUrlSyncedModals } from '$lib/modal/modal-state.svelte';
	import { canUploadProfilePhoto } from '$lib/permissions';
	import { get } from 'svelte/store';
	import { getTeachersPageState } from '../../teachers-page.svelte';
	import TeacherProfileEditModal from './TeacherProfileEditModal.svelte';

	const {
		teacher,
		onDeleted,
	}: {
		teacher: Teacher;
		onDeleted?: () => void;
	} = $props();

	const teachersPage = getTeachersPageState();

	const modals = createUrlSyncedModals({
		allowed: [
			'edit-profile',
			'delete',
			'add-unavailability',
			'edit-unavailability',
			'delete-unavailability',
		],
		getUrl: () => $page.url,
	});
	setDrawerUrlModals(modals);
	afterNavigate(() => {
		modals.hydrate();
	});
	const editProfileOpen = bindUrlModal(modals, 'edit-profile');
	const deleteOpen = bindUrlModal(modals, 'delete');

	const canChangePhoto = $derived(canUploadProfilePhoto('STAFF_UPDATE'));
	let deleteBusy = $state(false);
	const assignmentCount = $derived(teachersPage.assignmentCount(teacher.id) ?? 0);

	async function handlePhotoChange(file: File) {
		return teachersPage.updateProfilePhoto({
			teacherId: teacher.id,
			file,
			successMessage: get(t)('profilePhoto.updateSuccess'),
		});
	}

	async function confirmDelete() {
		deleteBusy = true;
		try {
			const ok = await teachersPage.deleteTeacher(teacher.id, {
				successMessage: get(t)('teacher.toastDeleted', { name: teacher.name }),
			});
			if (ok) {
				deleteOpen.open = false;
				onDeleted?.();
			}
		}
		finally {
			deleteBusy = false;
		}
	}
</script>

<DrawerEntityHeader
	name={teacher.name}
	summary={$t('teacher.assignmentCount', { n: assignmentCount })}
>
	{#snippet avatar()}
		{#if canChangePhoto}
			<ProfilePhotoPicker
				name={teacher.name}
				initials={teacher.initials}
				photoUrl={teacher.photoUrl}
				size="lg"
				onChange={handlePhotoChange}
			/>
		{:else}
			<PersonAvatar
				name={teacher.name}
				initials={teacher.initials}
				photoUrl={teacher.photoUrl}
				size="lg"
			/>
		{/if}
	{/snippet}
	{#snippet chips()}
		<span class="rounded-full bg-secondary px-2.5 py-0.5 text-[10px] font-medium uppercase tracking-wider text-foreground/80">
			{teacher.isActive ? $t('teacher.statusActive') : $t('teacher.statusInactive')}
		</span>
	{/snippet}
	{#snippet actions()}
		<PermissionGate permission="STAFF_UPDATE" mode="disable" tooltip={$t('teacher.permissionUpdate')}>
			{#snippet children({ disabled, title })}
				<TeacherProfileEditModal {teacher} {disabled} {title} bind:open={editProfileOpen.open} />
			{/snippet}
		</PermissionGate>
	{/snippet}
	{#snippet overflow()}
		<PermissionGate permission="STAFF_UPDATE" mode="disable" tooltip={$t('teacher.permissionUpdate')}>
			{#snippet children({ disabled, title })}
				<RowActionMenuItem
					{disabled}
					{title}
					destructive
					onclick={() => (deleteOpen.open = true)}
				>
					{$t('common.delete')}
				</RowActionMenuItem>
			{/snippet}
		</PermissionGate>
	{/snippet}
</DrawerEntityHeader>

<ConfirmModal
	bind:open={deleteOpen.open}
	title={$t('teacher.deleteTitle', { name: teacher.name })}
	description={$t('teacher.deleteDescription')}
	confirmLabel={$t('common.delete')}
	busy={deleteBusy}
	onConfirm={confirmDelete}
/>
