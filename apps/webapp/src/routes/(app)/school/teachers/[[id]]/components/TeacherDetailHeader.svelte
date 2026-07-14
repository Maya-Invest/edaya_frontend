<script lang="ts">
	import type { Teacher } from '$lib/types/school';
	import { page } from '$app/stores';
	import DrawerEntityHeader from '$lib/components/school/shared/DrawerEntityHeader.svelte';
	import PersonAvatar from '$lib/components/school/shared/PersonAvatar.svelte';
	import ConfirmModal from '$lib/components/ui/ConfirmModal.svelte';
	import PermissionGate from '$lib/components/ui/PermissionGate.svelte';
	import RowActionMenuItem from '$lib/components/ui/RowActionMenuItem.svelte';
	import { t } from '$lib/i18n';
	import { setDrawerUrlModals } from '$lib/modal/drawer-url-modals.svelte';
	import { bindUrlModal, createUrlSyncedModals } from '$lib/modal/modal-state.svelte';
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

	const modals = createUrlSyncedModals({ allowed: ['edit-profile'], getUrl: () => $page.url });
	setDrawerUrlModals(modals);
	$effect(() => {
		modals.hydrate();
	});
	const editProfileOpen = bindUrlModal(modals, 'edit-profile');

	let deleteOpen = $state(false);
	let deleteBusy = $state(false);

	async function confirmDelete() {
		deleteBusy = true;
		try {
			const ok = await teachersPage.deleteTeacher(teacher.id, {
				successMessage: get(t)('teacher.toastDeleted', { name: teacher.name }),
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
	name={teacher.name}
	summary={$t('teacher.drawerSummary')}
>
	{#snippet avatar()}
		<PersonAvatar
			name={teacher.name}
			initials={teacher.initials}
			photoUrl={teacher.photoUrl}
			size="lg"
		/>
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
	title={$t('teacher.deleteTitle', { name: teacher.name })}
	description={$t('teacher.deleteDescription')}
	confirmLabel={$t('common.delete')}
	busy={deleteBusy}
	onConfirm={confirmDelete}
/>
