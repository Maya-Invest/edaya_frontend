<script lang="ts">
	import type { Guardian } from '$lib/types/school';
	import { page } from '$app/stores';
	import AccountLinkingSection from '$lib/components/account/AccountLinkingSection.svelte';
	import { relationKey } from '$lib/components/school/shared/drawer-constants';
	import DrawerEmptyState from '$lib/components/school/shared/DrawerEmptyState.svelte';
	import DrawerEntityHeader from '$lib/components/school/shared/DrawerEntityHeader.svelte';
	import DrawerField from '$lib/components/school/shared/DrawerField.svelte';
	import PersonAvatar from '$lib/components/school/shared/PersonAvatar.svelte';
	import ProfilePhotoPicker from '$lib/components/school/shared/ProfilePhotoPicker.svelte';
	import ConfirmModal from '$lib/components/ui/ConfirmModal.svelte';
	import Label from '$lib/components/ui/label/label.svelte';
	import PermissionGate from '$lib/components/ui/PermissionGate.svelte';
	import RowActionMenuItem from '$lib/components/ui/RowActionMenuItem.svelte';
	import { t } from '$lib/i18n';
	import { Mail, Phone, Trash2, Users } from '$lib/icons';
	import { setDrawerUrlModals } from '$lib/modal/drawer-url-modals.svelte';
	import { bindUrlModal, createUrlSyncedModals } from '$lib/modal/modal-state.svelte';
	import { canUploadProfilePhoto } from '$lib/permissions';
	import { get } from 'svelte/store';
	import { getGuardiansPageState } from '../../guardians-page.svelte';
	import GuardianEditModal from './GuardianEditModal.svelte';

	const {
		guardian,
		onDeleted,
	}: {
		guardian: Guardian;
		onDeleted?: () => void;
	} = $props();

	const guardiansPage = getGuardiansPageState();

	const modals = createUrlSyncedModals({
		allowed: ['edit-profile', 'delete'],
		getUrl: () => $page.url,
	});
	setDrawerUrlModals(modals);
	$effect(() => {
		modals.hydrate();
	});
	const editProfileOpen = bindUrlModal(modals, 'edit-profile');
	const deleteOpen = bindUrlModal(modals, 'delete');

	const linked = $derived(guardiansPage.linkedStudents(guardian));
	const canChangePhoto = $derived(canUploadProfilePhoto('PARENT_UPDATE'));
	let deleteBusy = $state(false);

	async function handlePhotoChange(file: File) {
		return guardiansPage.updateProfilePhoto({
			guardianId: guardian.id,
			file,
			successMessage: get(t)('profilePhoto.updateSuccess'),
		});
	}

	async function confirmDelete() {
		deleteBusy = true;
		try {
			const ok = await guardiansPage.deleteGuardian(guardian.id, {
				successMessage: get(t)('guardian.toastDeleted', { name: guardian.name }),
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

<div class="space-y-5">
	<DrawerEntityHeader
		name={guardian.name}
		summary={$t('guardian.prefers', {
			rel: relationKey[guardian.relation]
				? $t(relationKey[guardian.relation]!)
				: guardian.relation,
			contact: $t(`guardian.contact.${guardian.preferredContact}`),
		})}
	>
		{#snippet avatar()}
			{#if canChangePhoto}
				<ProfilePhotoPicker
					name={guardian.name}
					initials={guardian.initials}
					photoUrl={guardian.photoUrl}
					size="lg"
					onChange={handlePhotoChange}
				/>
			{:else}
				<PersonAvatar name={guardian.name} initials={guardian.initials} photoUrl={guardian.photoUrl} size="lg" />
			{/if}
		{/snippet}
		{#snippet actions()}
			<PermissionGate permission="PARENT_UPDATE" mode="disable" tooltip={$t('guardian.permissionUpdate')}>
				{#snippet children({ disabled, title })}
					<GuardianEditModal {guardian} {disabled} {title} bind:open={editProfileOpen.open} />
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
						onclick={() => (deleteOpen.open = true)}
					>
						<Trash2 class="h-4 w-4" />
						{$t('common.delete')}
					</RowActionMenuItem>
				{/snippet}
			</PermissionGate>
		{/snippet}
	</DrawerEntityHeader>

	<DrawerField label={$t('guardian.fullName')}>
		<div class="min-h-10 rounded-md border border-input bg-secondary/30 px-3 py-2 text-sm">{guardian.name}</div>
	</DrawerField>
	<div class="grid grid-cols-2 gap-3">
		<DrawerField label={$t('common.email')}>
			<div class="flex min-h-10 items-center gap-2 rounded-md border border-input bg-secondary/30 px-3 py-2 text-sm">
				<Mail class="h-3.5 w-3.5 text-muted-foreground" />
				{guardian.email || '—'}
			</div>
		</DrawerField>
		<DrawerField label={$t('common.phone')}>
			<div class="flex min-h-10 items-center gap-2 rounded-md border border-input bg-secondary/30 px-3 py-2 text-sm">
				<Phone class="h-3.5 w-3.5 text-muted-foreground" />
				{guardian.phone || '—'}
			</div>
		</DrawerField>
	</div>

	<AccountLinkingSection
		kind="guardian"
		targetId={guardian.id}
		subjectId={guardian.subjectId}
		contactEmail={guardian.email}
		displayName={guardian.name}
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
				{#each linked as student (student.id)}
					<div class="flex items-center gap-2 rounded-lg bg-primary/5 px-3 py-2">
						<PersonAvatar
							name={student.name}
							initials={student.initials}
							photoUrl={student.photoUrl}
							size="md"
						/>
						<span class="text-sm">{student.name}</span>
						<span class="ml-auto font-sans tabular-nums text-[10px] uppercase text-muted-foreground">{student.classId}</span>
					</div>
				{/each}
			</div>
		{/if}
	</div>
</div>

<ConfirmModal
	bind:open={deleteOpen.open}
	title={$t('common.deleteConfirmTitle')}
	description={$t('guardian.deleteConfirm', { name: guardian.name })}
	confirmLabel={$t('common.delete')}
	cancelLabel={$t('common.cancel')}
	busy={deleteBusy}
	onConfirm={confirmDelete}
/>
