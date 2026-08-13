<script lang="ts">
	import type { components } from '$lib/api/schema';
	import type { ClassNode } from '$lib/types/school';
	import { afterNavigate } from '$app/navigation';
	import { page } from '$app/stores';
	import { catalogEntriesForClassGroupStaffAssignment } from '$lib/api/staff-assignment-permissions';
	import { formatPermissionLabel } from '$lib/api/staff-permission-assignments-data';
	import PermissionCheckboxGroup from '$lib/components/school/configuration/PermissionCheckboxGroup.svelte';
	import StaffPicker from '$lib/components/school/shared/pickers/StaffPicker.svelte';
	import Button from '$lib/components/ui/button/button.svelte';
	import ConfirmModal from '$lib/components/ui/ConfirmModal.svelte';
	import FormModal from '$lib/components/ui/FormModal.svelte';
	import Input from '$lib/components/ui/input/input.svelte';
	import Label from '$lib/components/ui/label/label.svelte';
	import PermissionGate from '$lib/components/ui/PermissionGate.svelte';
	import { t } from '$lib/i18n';
	import { Plus, Trash2 } from '$lib/icons';
	import { bindUrlModal, createUrlSyncedModals } from '$lib/modal/modal-state.svelte';
	import { pruneStaffAssignmentPermissions } from '$lib/school/staff-assignment-form-helpers';
	import { get } from 'svelte/store';
	import { getClassGroupAssignmentsTabState } from '../[[id]]/(tabs)/assignments/class-group-assignments-tab.svelte';
	import { getClassesPageState } from '../classes-page.svelte';

	type StaffAssignment = components['schemas']['StaffAssignment'];

	const { classGroup }: { classGroup: ClassNode } = $props();

	const classesPage = getClassesPageState();
	const assignmentsTab = getClassGroupAssignmentsTabState();

	const modals = createUrlSyncedModals({
		allowed: ['form', 'delete-assignment'],
		getUrl: () => $page.url,
	});
	const formOpen = bindUrlModal(modals, 'form');
	const deleteOpen = bindUrlModal(modals, 'delete-assignment');

	let deleteBusy = $state(false);
	let formBusy = $state(false);
	let staffId = $state('');
	let responsibility = $state('');
	let permissions = $state<StaffAssignment['permissions']>([]);

	const rows = $derived(classesPage.staffAssignmentsForClassGroup(classGroup.id));
	const staff = $derived(classesPage.staff);
	const catalog = $derived(classesPage.permissionCatalog);
	const permissionEntries = $derived(catalogEntriesForClassGroupStaffAssignment(catalog));
	const editing = $derived(
		modals.isOpen('form') && modals.target
			? rows.find(row => row.id === modals.target) ?? null
			: null,
	);
	const deleteTarget = $derived(
		modals.isOpen('delete-assignment') && modals.target
			? rows.find(row => row.id === modals.target) ?? null
			: null,
	);

	function validateModalTarget(): boolean {
		if (!modals.ready || assignmentsTab.loadedClassGroupId !== classGroup.id) {
			return false;
		}
		if (modals.active === 'form' && modals.target !== null && !editing) {
			modals.close();
			return false;
		}
		if (modals.active === 'delete-assignment' && !deleteTarget) {
			modals.close();
			return false;
		}
		return true;
	}

	function staffName(memberId: string): string {
		return staff.find(member => member.id === memberId)?.name ?? memberId;
	}

	function resetForm(assignment: StaffAssignment | null) {
		if (assignment) {
			staffId = assignment.staffId;
			responsibility = assignment.responsibility;
			permissions = [...(assignment.permissions ?? [])];
		}
		else {
			staffId = staff[0]?.id ?? '';
			responsibility = '';
			permissions = [];
		}
	}

	function openCreate() {
		void prepareForm(null);
		modals.open('form');
	}

	function openEdit(row: StaffAssignment) {
		void prepareForm(row);
		modals.open('form', { target: row.id });
	}

	async function prepareForm(assignment: StaffAssignment | null) {
		resetForm(assignment);
		await classesPage.ensurePermissionCatalog();
		const pruned = pruneStaffAssignmentPermissions(
			permissions,
			permissionEntries.map(entry => entry.permission),
		);
		if (pruned) {
			permissions = pruned;
		}
	}

	afterNavigate(() => {
		modals.hydrate();
		if (validateModalTarget() && modals.isOpen('form')) {
			void prepareForm(editing);
		}
	});

	const canSubmit = $derived(responsibility.trim().length > 0 && staffId.length > 0);

	async function submitForm() {
		if (!canSubmit || formBusy) {
			return;
		}

		formBusy = true;
		const id = editing?.id ?? `sa-${Date.now().toString(36)}`;
		const payload = classesPage.buildStaffAssignmentPayload({
			id,
			staffId,
			responsibility: responsibility.trim(),
			permissions,
			classGroupId: classGroup.id,
		});

		const ok = await classesPage.saveStaffAssignment({
			assignment: payload,
			successMessage: get(t)('classGroups.assignmentSaved'),
		});
		formBusy = false;

		if (ok) {
			formOpen.open = false;
		}
	}

	async function removeRow() {
		const row = deleteTarget;
		if (deleteBusy) {
			return;
		}
		if (!row) {
			return;
		}
		deleteBusy = true;
		try {
			const ok = await classesPage.deleteStaffAssignment({
				id: row.id,
				successMessage: get(t)('classGroups.assignmentDeleted'),
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

<div class="space-y-3">
	<div class="flex items-center justify-between gap-2">
		<div>
			<h4 class="text-sm font-semibold">{$t('classGroups.assignmentsTab')}</h4>
			<p class="text-xs text-muted-foreground">{$t('classGroups.assignmentsHint')}</p>
		</div>
		<PermissionGate permission="STAFF_UPDATE" mode="disable">
			{#snippet children({ disabled })}
				<Button size="sm" class="rounded-full" {disabled} onclick={openCreate}>
					<Plus class="mr-1.5 h-3.5 w-3.5" />
					{$t('classGroups.addAssignment')}
				</Button>
			{/snippet}
		</PermissionGate>
	</div>

	{#if rows.length === 0}
		<p class="text-sm text-muted-foreground">{$t('classGroups.noAssignments')}</p>
	{:else}
		<ul class="divide-y divide-border/60 overflow-hidden rounded-xl border border-border bg-card">
			{#each rows as row (row.id)}
				<li class="flex items-start justify-between gap-3 px-4 py-3">
					<button
						type="button"
						class="min-w-0 flex-1 text-left"
						onclick={() => openEdit(row)}
					>
						<div class="text-sm font-medium">{row.responsibility}</div>
						<div class="mt-1 text-xs text-muted-foreground">{staffName(row.staffId)}</div>
						{#if (row.permissions ?? []).length > 0}
							<div class="mt-2 flex flex-wrap gap-1">
								{#each row.permissions ?? [] as permission (permission)}
									<span class="rounded-full bg-muted px-2 py-0.5 text-[10px] text-muted-foreground">
										{formatPermissionLabel(permission, $t)}
									</span>
								{/each}
							</div>
						{/if}
					</button>
					<PermissionGate permission="STAFF_UPDATE" mode="disable">
						{#snippet children({ disabled })}
							<Button
								variant="ghost"
								size="icon"
								class="h-8 w-8 rounded-full"
								disabled={disabled || deleteBusy}
								onclick={() => modals.open('delete-assignment', { target: row.id })}
							>
								<Trash2 class="h-4 w-4" />
							</Button>
						{/snippet}
					</PermissionGate>
				</li>
			{/each}
		</ul>
	{/if}
</div>

<FormModal
	bind:open={formOpen.open}
	title={editing ? $t('classGroups.editAssignment') : $t('classGroups.addAssignment')}
	description={$t('classGroups.assignmentFormHint')}
	submitLabel={$t('common.save')}
	busy={formBusy}
	submitDisabled={!canSubmit}
	onSubmit={submitForm}
>
	<div class="space-y-4">
		<div class="space-y-2">
			<Label>{$t('classGroups.assignmentStaff')}</Label>
			<StaffPicker bind:value={staffId} {staff} active={formOpen.open} placeholder={$t('classGroups.selectStaff')} />
		</div>

		<div class="space-y-2">
			<Label for="class-assignment-responsibility">{$t('classGroups.assignmentResponsibility')}</Label>
			<Input
				id="class-assignment-responsibility"
				bind:value={responsibility}
				placeholder={$t('classGroups.assignmentResponsibilityPlaceholder')}
			/>
		</div>

		<div class="space-y-2">
			<Label>{$t('staff.assignmentPermissions')}</Label>
			<p class="text-xs text-muted-foreground">{$t('staff.assignmentPermissionsHint')}</p>
			<PermissionCheckboxGroup entries={permissionEntries} bind:selected={permissions} />
		</div>
	</div>
</FormModal>

<ConfirmModal
	bind:open={deleteOpen.open}
	title={$t('common.deleteConfirmTitle')}
	confirmLabel={$t('common.delete')}
	cancelLabel={$t('common.cancel')}
	busy={deleteBusy}
	onConfirm={removeRow}
/>
