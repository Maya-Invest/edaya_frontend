<script lang="ts">
	import type { Guardian } from '$lib/types/school';
	import { deleteGuardianMutation } from '$lib/api/mutations/delete-entity.mutations';
	import { updateGuardianProfilePhotoMutation } from '$lib/api/mutations/profile-photo.mutations';
	import AccountLinkingSection from '$lib/components/account/AccountLinkingSection.svelte';
	import DeleteEntityButton from '$lib/components/ui/DeleteEntityButton.svelte';
	import Label from '$lib/components/ui/label/label.svelte';
	import PermissionGate from '$lib/components/ui/PermissionGate.svelte';
	import { detailDataContext } from '$lib/detail-data/context.svelte';
	import { t } from '$lib/i18n';
	import { Mail, Phone, Users } from '$lib/icons';
	import { canUploadProfilePhoto } from '$lib/permissions';
	import { get } from 'svelte/store';
	import { relationKey } from '../shared/drawer-constants.ts';
	import DrawerActionBar from '../shared/DrawerActionBar.svelte';
	import DrawerEmptyState from '../shared/DrawerEmptyState.svelte';
	import DrawerField from '../shared/DrawerField.svelte';
	import PersonAvatar from '../shared/PersonAvatar.svelte';
	import ProfilePhotoPicker from '../shared/ProfilePhotoPicker.svelte';
	import GuardianEditModal from './GuardianEditModal.svelte';

	const { g }: { g: Guardian } = $props();

	const linked = $derived(detailDataContext.students.filter(s => g.studentIds.includes(s.id)));
	const canChangePhoto = $derived(canUploadProfilePhoto('PARENT_UPDATE'));

	async function handlePhotoChange(file: File) {
		return updateGuardianProfilePhotoMutation({
			guardianId: g.id,
			file,
			successMessage: get(t)('profilePhoto.updateSuccess'),
		});
	}
</script>

<div class="space-y-5">
	<div class="flex items-center gap-4">
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
		<div>
			<h3 class="font-display text-2xl font-semibold leading-tight">{g.name}</h3>
			<p class="text-sm text-muted-foreground">
				{$t('guardian.prefers', {
					rel: $t(relationKey[g.relation]),
					contact: $t(`guardian.contact.${g.preferredContact}`),
				})}
			</p>
		</div>
	</div>

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

	<DrawerActionBar>
		<PermissionGate permission="PARENT_UPDATE" mode="disable" tooltip={$t('guardian.permissionUpdate')}>
			{#snippet children({ disabled, title })}
				<GuardianEditModal {g} {disabled} {title} />
			{/snippet}
		</PermissionGate>
		<PermissionGate permission="PARENT_UPDATE" mode="disable" tooltip={$t('guardian.permissionUpdate')}>
			{#snippet children({ disabled, title })}
				<DeleteEntityButton
					{disabled}
					{title}
					confirmTitle={$t('common.deleteConfirmTitle')}
					confirmDescription={$t('guardian.deleteConfirm', { name: g.name })}
					onConfirm={() => deleteGuardianMutation(g.id, {
						successMessage: get(t)('guardian.toastDeleted', { name: g.name }),
					})}
				/>
			{/snippet}
		</PermissionGate>
	</DrawerActionBar>

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
