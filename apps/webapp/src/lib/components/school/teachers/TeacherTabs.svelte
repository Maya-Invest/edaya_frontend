<script lang="ts">
	import type { Teacher } from '$lib/types/school';
	import { page } from '$app/stores';
	import { deleteTeacherMutation, updateTeacherStatusMutation } from '$lib/api/mutations/teacher.mutations';
	import AccountLinkingSection from '$lib/components/account/AccountLinkingSection.svelte';
	import Checkbox from '$lib/components/ui/checkbox/checkbox.svelte';
	import ConfirmModal from '$lib/components/ui/ConfirmModal.svelte';
	import DrawerTabBar from '$lib/components/ui/DrawerTabBar.svelte';
	import Label from '$lib/components/ui/label/label.svelte';
	import PermissionGate from '$lib/components/ui/PermissionGate.svelte';
	import RowActionMenuItem from '$lib/components/ui/RowActionMenuItem.svelte';
	import { createUrlSyncedDrawerTabs } from '$lib/drawer/drawer-tabs-state.svelte';
	import { t } from '$lib/i18n';
	import { Mail, Phone } from '$lib/icons';
	import { setDrawerUrlModals } from '$lib/modal/drawer-url-modals.svelte';
	import { bindUrlModal, createUrlSyncedModals } from '$lib/modal/modal-state.svelte';
	import { get } from 'svelte/store';
	import DrawerEntityHeader from '../shared/DrawerEntityHeader.svelte';
	import DrawerField from '../shared/DrawerField.svelte';
	import PersonAvatar from '../shared/PersonAvatar.svelte';
	import TeacherAssignmentsSection from './TeacherAssignmentsSection.svelte';
	import TeacherProfileEditModal from './TeacherProfileEditModal.svelte';

	const { teacher }: { teacher: Teacher } = $props();

	type TeacherTab = 'profile' | 'assignments';

	const tabs = createUrlSyncedDrawerTabs<TeacherTab>({
		allowed: ['profile', 'assignments'],
		defaultTab: 'profile',
		getUrl: () => $page.url,
	});

	$effect(() => {
		tabs.hydrate();
	});

	const tabItems = $derived([
		{ key: 'profile', label: $t('drawer.tab.profile') },
		{ key: 'assignments', label: $t('drawer.tab.assignments') },
	] as const);

	const modals = createUrlSyncedModals({ allowed: ['edit-profile'], getUrl: () => $page.url });
	setDrawerUrlModals(modals);
	$effect(() => {
		modals.hydrate();
	});
	const editProfileOpen = bindUrlModal(modals, 'edit-profile');

	let optimisticActive = $state<boolean | null>(null);
	let statusBusy = $state(false);
	let deleteOpen = $state(false);
	let deleteBusy = $state(false);

	const active = $derived(optimisticActive ?? teacher.isActive);

	async function handleActiveChange(checked: boolean | 'indeterminate') {
		if (checked === 'indeterminate' || statusBusy)
			return;

		const previous = active;
		optimisticActive = checked;
		statusBusy = true;
		const ok = await updateTeacherStatusMutation({
			teacherId: teacher.id,
			isActive: checked,
			successMessage: get(t)(
				checked ? 'teacher.activateSuccess' : 'teacher.deactivateSuccess',
				{ name: teacher.name },
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

	async function confirmDelete() {
		deleteBusy = true;
		try {
			const ok = await deleteTeacherMutation(teacher.id, {
				successMessage: get(t)('teacher.toastDeleted', { name: teacher.name }),
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

	<DrawerTabBar tabs={tabItems} active={tabs.tab} onSelect={key => tabs.select(key as TeacherTab)} />

	{#if tabs.tab === 'profile'}
		<div class="space-y-4">
			<DrawerField label={$t('guardian.fullName')}>
				<div class="min-h-10 rounded-md border border-input bg-secondary/30 px-3 py-2 text-sm">{teacher.name}</div>
			</DrawerField>
			<DrawerField label={$t('common.email')}>
				<div class="flex min-h-10 items-center gap-2 rounded-md border border-input bg-secondary/30 px-3 py-2 text-sm">
					<Mail class="h-3.5 w-3.5 text-muted-foreground" />
					{teacher.email || '—'}
				</div>
			</DrawerField>
			<DrawerField label={$t('common.phone')}>
				<div class="flex min-h-10 items-center gap-2 rounded-md border border-input bg-secondary/30 px-3 py-2 text-sm">
					<Phone class="h-3.5 w-3.5 text-muted-foreground" />
					{teacher.phone || '—'}
				</div>
			</DrawerField>
			<PermissionGate permission="STAFF_UPDATE" mode="disable">
				{#snippet children({ disabled })}
					<div class="flex items-center gap-2 rounded-xl border border-border bg-card px-4 py-3">
						<Checkbox
							checked={active}
							disabled={disabled || statusBusy}
							onCheckedChange={handleActiveChange}
							id={`teacher-active-${teacher.id}`}
						/>
						<Label for={`teacher-active-${teacher.id}`} class="text-sm">
							{$t('teacher.activeLabel')}
						</Label>
					</div>
				{/snippet}
			</PermissionGate>
			<AccountLinkingSection
				kind="teacher"
				targetId={teacher.id}
				subjectId={teacher.subjectId}
				contactEmail={teacher.email}
				displayName={teacher.name}
			/>
		</div>
	{:else}
		<TeacherAssignmentsSection {teacher} />
	{/if}
</div>

<ConfirmModal
	bind:open={deleteOpen}
	title={$t('teacher.deleteTitle', { name: teacher.name })}
	description={$t('teacher.deleteDescription')}
	confirmLabel={$t('common.delete')}
	busy={deleteBusy}
	onConfirm={confirmDelete}
/>
