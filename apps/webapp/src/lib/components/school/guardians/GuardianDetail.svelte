<script lang="ts">
	import type { Guardian } from '$lib/types/school';
	import { page } from '$app/stores';
	import { deleteGuardianMutation } from '$lib/api/mutations/delete-entity.mutations';
	import { updateGuardianProfilePhotoMutation } from '$lib/api/mutations/profile-photo.mutations';
	import AccountLinkingSection from '$lib/components/account/AccountLinkingSection.svelte';
	import ConfirmModal from '$lib/components/ui/ConfirmModal.svelte';
	import Label from '$lib/components/ui/label/label.svelte';
	import PermissionGate from '$lib/components/ui/PermissionGate.svelte';
	import RowActionMenuItem from '$lib/components/ui/RowActionMenuItem.svelte';
	import { detailDataContext } from '$lib/detail-data/context.svelte';
	import { t } from '$lib/i18n';
	import { Mail, Phone, Trash2, Users } from '$lib/icons';
	import { setDrawerUrlModals } from '$lib/modal/drawer-url-modals.svelte';
	import { bindUrlModal, createUrlSyncedModals } from '$lib/modal/modal-state.svelte';
	import { canUploadProfilePhoto } from '$lib/permissions';
	import { get } from 'svelte/store';
	import { relationKey } from '../shared/drawer-constants.ts';
	import DrawerEmptyState from '../shared/DrawerEmptyState.svelte';
	import DrawerEntityHeader from '../shared/DrawerEntityHeader.svelte';
	import DrawerField from '../shared/DrawerField.svelte';
	import PersonAvatar from '../shared/PersonAvatar.svelte';
	import ProfilePhotoPicker from '../shared/ProfilePhotoPicker.svelte';
	import GuardianEditModal from './GuardianEditModal.svelte';

	const { g }: { g: Guardian } = $props();

	const modals = createUrlSyncedModals({ allowed: ['edit-profile'], getUrl: () => $page.url });
	setDrawerUrlModals(modals);
	$effect(() => {
		modals.hydrate();
	});
	const editProfileOpen = bindUrlModal(modals, 'edit-profile');

	const linked = $derived(detailDataContext.students.filter(s => g.studentIds.includes(s.id)));
	const canChangePhoto = $derived(canUploadProfilePhoto('PARENT_UPDATE'));
	let deleteOpen = $state(false);
	let deleteBusy = $state(false);

	async function handlePhotoChange(file: File) {
		return updateGuardianProfilePhotoMutation({
			guardianId: g.id,
			file,
			successMessage: get(t)('profilePhoto.updateSuccess'),
		});
	}

	async function confirmDelete() {
		deleteBusy = true;
		try {
			const ok = await deleteGuardianMutation(g.id, {
				successMessage: get(t)('guardian.toastDeleted', { name: g.name }),
			});
			if (ok) {
				deleteOpen = false;
			}
		}
		finally {
			deleteBusy = false;
		}
	}
</script>

<div class="space-y-5">
	<DrawerEntityHeader
		name={g.name}
		summary={$t('guardian.prefers', {
			rel: $t(relationKey[g.relation]),
			contact: $t(`guardian.contact.${g.preferredContact}`),
		})}
	>
		{#snippet avatar()}
			{#if canChangePhoto}
				<ProfilePhotoPicker
					name={g.name}
					initials={g.initials}
					photoUrl={g.photoUrl}
					size="lg"
					onChange={handlePhotoChange}
				/>
			{:else}
				<PersonAvatar name={g.name} initials={g.initials} photoUrl={g.photoUrl} size="lg" />
			{/if}
		{/snippet}
		{#snippet actions()}
			<PermissionGate permission="PARENT_UPDATE" mode="disable" tooltip={$t('guardian.permissionUpdate')}>
				{#snippet children({ disabled, title })}
					<GuardianEditModal {g} {disabled} {title} bind:open={editProfileOpen.open} />
				{/snippet}
			</PermissionGate>
		{/snippet}
		{#snippet overflow()}
			<PermissionGate permission="PARENT_UPDATE" mode="disable" tooltip={$t('guardian.permissionUpdate')}>
				{#snippet children({ disabled, title })}
					<RowActionMenuItem
						destructive
						{disabled}
						{title}
						onclick={() => (deleteOpen = true)}
					>
						<Trash2 class="h-4 w-4" />
						{$t('common.delete')}
					</RowActionMenuItem>
				{/snippet}
			</PermissionGate>
		{/snippet}
	</DrawerEntityHeader>

	<DrawerField label={$t('guardian.fullName')}>
		<div class="min-h-10 rounded-md border border-input bg-secondary/30 px-3 py-2 text-sm">{g.name}</div>
	</DrawerField>
	<div class="grid grid-cols-2 gap-3">
		<DrawerField label={$t('common.email')}>
			<div class="flex min-h-10 items-center gap-2 rounded-md border border-input bg-secondary/30 px-3 py-2 text-sm">
				<Mail class="h-3.5 w-3.5 text-muted-foreground" />
				{g.email || '—'}
			</div>
		</DrawerField>
		<DrawerField label={$t('common.phone')}>
			<div class="flex min-h-10 items-center gap-2 rounded-md border border-input bg-secondary/30 px-3 py-2 text-sm">
				<Phone class="h-3.5 w-3.5 text-muted-foreground" />
				{g.phone || '—'}
			</div>
		</DrawerField>
	</div>

	<AccountLinkingSection
		kind="guardian"
		targetId={g.id}
		subjectId={g.subjectId}
		contactEmail={g.email}
		displayName={g.name}
	/>

	<div class="space-y-2 border-t border-border pt-4">
		<Label class="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
			{$t('guardian.linkedStudents')}
		</Label>
		{#if linked.length === 0}
			<DrawerEmptyState label={$t('drawer.noGuardian')}>
				{#snippet icon()}
					<Users class="h-5 w-5 text-muted-foreground" />
				{/snippet}
			</DrawerEmptyState>
		{:else}
			<div class="space-y-2">
				{#each linked as s (s.id)}
					<div class="flex items-center gap-2 rounded-lg bg-primary/5 px-3 py-2">
						<PersonAvatar
							name={s.name}
							initials={s.initials}
							photoUrl={s.photoUrl}
							size="md"
						/>
						<span class="text-sm">{s.name}</span>
						<span class="ml-auto font-mono text-[10px] uppercase text-muted-foreground">{s.classId}</span>
					</div>
				{/each}
			</div>
		{/if}
	</div>
</div>

<ConfirmModal
	bind:open={deleteOpen}
	title={$t('common.deleteConfirmTitle')}
	description={$t('guardian.deleteConfirm', { name: g.name })}
	confirmLabel={$t('common.delete')}
	cancelLabel={$t('common.cancel')}
	busy={deleteBusy}
	onConfirm={confirmDelete}
/>
