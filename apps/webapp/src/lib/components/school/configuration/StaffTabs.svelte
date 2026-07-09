<script lang="ts">
	import type { StaffPermissionAssignmentView } from '$lib/api/staff-permission-assignments-data';
	import type { StaffMember } from '$lib/types/school';
	import { page } from '$app/stores';
	import { academicContext } from '$lib/academic/context.svelte';
	import { deleteStaffMemberMutation } from '$lib/api/mutations/delete-entity.mutations';
	import { updateStaffProfilePhotoMutation } from '$lib/api/mutations/profile-photo.mutations';
	import { updateStaffMemberStatusMutation } from '$lib/api/mutations/staff.mutations';
	import AccountLinkingSection from '$lib/components/account/AccountLinkingSection.svelte';
	import Checkbox from '$lib/components/ui/checkbox/checkbox.svelte';
	import ConfirmModal from '$lib/components/ui/ConfirmModal.svelte';
	import DrawerTabBar from '$lib/components/ui/DrawerTabBar.svelte';
	import Label from '$lib/components/ui/label/label.svelte';
	import PermissionGate from '$lib/components/ui/PermissionGate.svelte';
	import RowActionMenuItem from '$lib/components/ui/RowActionMenuItem.svelte';
	import { createUrlSyncedDrawerTabs } from '$lib/drawer/drawer-tabs-state.svelte';
	import { t } from '$lib/i18n';
	import { Mail } from '$lib/icons';
	import { setDrawerUrlModals } from '$lib/modal/drawer-url-modals.svelte';
	import { bindUrlModal, createUrlSyncedModals } from '$lib/modal/modal-state.svelte';
	import { canUploadProfilePhoto } from '$lib/permissions';
	import { get } from 'svelte/store';
	import DrawerEntityHeader from '../shared/DrawerEntityHeader.svelte';
	import DrawerField from '../shared/DrawerField.svelte';
	import PersonAvatar from '../shared/PersonAvatar.svelte';
	import ProfilePhotoPicker from '../shared/ProfilePhotoPicker.svelte';
	import StaffAssignmentsSummary from './StaffAssignmentsSummary.svelte';
	import StaffPermissionFormModal from './StaffPermissionFormModal.svelte';
	import StaffPermissionsList from './StaffPermissionsList.svelte';
	import StaffProfileEditModal from './StaffProfileEditModal.svelte';

	const { s }: { s: StaffMember } = $props();

	type StaffDrawerModal = 'edit-profile' | 'add-permission';

	type StaffTab = 'profile' | 'permissions' | 'assignments';

	const tabs = createUrlSyncedDrawerTabs<StaffTab>({
		allowed: ['profile', 'permissions', 'assignments'],
		defaultTab: 'profile',
		getUrl: () => $page.url,
	});

	$effect(() => {
		tabs.hydrate();
	});

	const tabItems = $derived([
		{ key: 'profile', label: $t('drawer.tab.profile') },
		{ key: 'permissions', label: $t('drawer.tab.permissions') },
		{ key: 'assignments', label: $t('drawer.tab.assignments') },
	] as const);

	const modals = createUrlSyncedModals<StaffDrawerModal>({
		allowed: ['edit-profile', 'add-permission'],
		getUrl: () => $page.url,
	});
	setDrawerUrlModals(modals);
	$effect(() => {
		modals.hydrate();
	});
	const editProfileOpen = bindUrlModal(modals, 'edit-profile');
	const addPermissionOpen = bindUrlModal(modals, 'add-permission');

	let permissionEditing = $state<StaffPermissionAssignmentView | null>(null);

	$effect(() => {
		if (!addPermissionOpen.open) {
			permissionEditing = null;
		}
	});

	let optimisticActive = $state<boolean | null>(null);
	let statusBusy = $state(false);
	let deleteOpen = $state(false);
	let deleteBusy = $state(false);

	const active = $derived(optimisticActive ?? s.isActive);
	const canChangePhoto = $derived(canUploadProfilePhoto('STAFF_UPDATE'));

	async function handlePhotoChange(file: File) {
		return updateStaffProfilePhotoMutation({
			staffId: s.id,
			file,
			successMessage: get(t)('profilePhoto.updateSuccess'),
		});
	}

	const classLabels = $derived(
		s.classes.map(id => academicContext.classes.find(c => c.id === id)?.name ?? id),
	);

	async function handleActiveChange(checked: boolean | 'indeterminate') {
		if (checked === 'indeterminate' || statusBusy)
			return;

		const previous = active;
		optimisticActive = checked;
		statusBusy = true;
		const ok = await updateStaffMemberStatusMutation({
			staffId: s.id,
			isActive: checked,
			successMessage: get(t)(
				checked ? 'staff.activateSuccess' : 'staff.deactivateSuccess',
				{ name: s.name },
			),
		});
		statusBusy = false;
		if (ok) {
			optimisticActive = null;
		}
		else {
			optimisticActive = previous;
		}
	}

	function focusPermissionsTab() {
		tabs.select('permissions');
	}

	async function confirmDelete() {
		deleteBusy = true;
		try {
			const ok = await deleteStaffMemberMutation(s.id, {
				successMessage: get(t)('staff.toastDeleted', { name: s.name }),
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
		name={s.name}
		summary={`${$t(`staff.role.${s.role}`)} · ${s.department}`}
	>
		{#snippet avatar()}
			{#if canChangePhoto}
				<ProfilePhotoPicker
					name={s.name}
					initials={s.initials}
					photoUrl={s.photoUrl}
					size="lg"
					onChange={handlePhotoChange}
				/>
			{:else}
				<PersonAvatar name={s.name} initials={s.initials} photoUrl={s.photoUrl} size="lg" />
			{/if}
		{/snippet}
		{#snippet actions()}
			<PermissionGate permission="STAFF_UPDATE" mode="disable" tooltip={$t('staff.permissionUpdate')}>
				{#snippet children({ disabled, title })}
					<StaffProfileEditModal {s} {disabled} {title} bind:open={editProfileOpen.open} />
				{/snippet}
			</PermissionGate>
			<PermissionGate permission="ACCESS_CONTROL_ASSIGN" mode="disable" tooltip={$t('staff.permissionAssign')}>
				{#snippet children({ disabled, title })}
					<button
						type="button"
						class="inline-flex h-9 items-center rounded-full border border-input bg-background px-4 text-sm font-medium transition hover:bg-secondary disabled:opacity-50"
						{disabled}
						{title}
						onclick={focusPermissionsTab}
					>
						{$t('staff.managePermissions')}
					</button>
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

	<DrawerTabBar tabs={tabItems} active={tabs.tab} onSelect={key => tabs.select(key as StaffTab)} />

	{#if tabs.tab === 'profile'}
		<div class="space-y-4">
			<DrawerField label={$t('guardian.fullName')}>
				<div class="min-h-10 rounded-md border border-input bg-secondary/30 px-3 py-2 text-sm">{s.name}</div>
			</DrawerField>
			<DrawerField label={$t('common.email')}>
				<div class="flex min-h-10 items-center gap-2 rounded-md border border-input bg-secondary/30 px-3 py-2 text-sm">
					<Mail class="h-3.5 w-3.5 text-muted-foreground" />
					{s.email || '—'}
				</div>
			</DrawerField>
			<DrawerField label={$t('people.role')}>
				<div class="min-h-10 rounded-md border border-input bg-secondary/30 px-3 py-2 text-sm">
					{$t(`staff.role.${s.role}`)}
				</div>
			</DrawerField>
			<DrawerField label={$t('people.department')}>
				<div class="min-h-10 rounded-md border border-input bg-secondary/30 px-3 py-2 text-sm">{s.department}</div>
			</DrawerField>

			{#if s.subjectLabels && s.subjectLabels.length > 0}
				<DrawerField label={$t('reportCards.subjects')}>
					<p class="text-sm text-muted-foreground">{s.subjectLabels.join(', ')}</p>
				</DrawerField>
			{/if}

			{#if classLabels.length > 0}
				<DrawerField label={$t('staff.assignedClasses')}>
					<div class="flex flex-wrap gap-1.5">
						{#each classLabels as label (label)}
							<span
								class="rounded-md bg-secondary px-2 py-0.5 font-mono text-[10px] text-muted-foreground"
							>
								{label}
							</span>
						{/each}
					</div>
				</DrawerField>
			{/if}

			<div class="flex items-center justify-between rounded-xl border border-border bg-card px-4 py-3">
				<div>
					<Label class="text-sm font-medium">{$t('staff.activeLabel')}</Label>
					<p class="text-xs text-muted-foreground">{$t('staff.activeHint')}</p>
				</div>
				<PermissionGate permission="STAFF_UPDATE" mode="disable" tooltip={$t('staff.permissionUpdate')}>
					{#snippet children({ disabled })}
						<Checkbox
							checked={active}
							disabled={disabled || statusBusy}
							onCheckedChange={handleActiveChange}
						/>
					{/snippet}
				</PermissionGate>
			</div>

			<AccountLinkingSection
				kind="staff"
				targetId={s.id}
				subjectId={s.subjectId}
				contactEmail={s.email}
				displayName={s.name}
			/>
		</div>
	{:else if tabs.tab === 'permissions'}
		<StaffPermissionsList {s} bind:editing={permissionEditing} />
	{:else}
		<StaffAssignmentsSummary staff={s} />
	{/if}
</div>

<StaffPermissionFormModal
	bind:open={addPermissionOpen.open}
	staff={s}
	assignment={permissionEditing}
/>

<ConfirmModal
	bind:open={deleteOpen}
	title={$t('common.deleteConfirmTitle')}
	description={$t('staff.deleteConfirm', { name: s.name })}
	confirmLabel={$t('common.delete')}
	busy={deleteBusy}
	onConfirm={confirmDelete}
/>
