<script lang="ts">
	import type { components } from '$lib/api/schema';
	import type { ClassNode } from '$lib/types/school';
	import { page } from '$app/stores';
	import { catalogEntriesForClassGroupStaffAssignment } from '$lib/api/staff-assignment-permissions';
	import { formatPermissionLabel } from '$lib/api/staff-permission-assignments-data';
	import PermissionCheckboxGroup from '$lib/components/school/configuration/PermissionCheckboxGroup.svelte';
	import StaffPicker from '$lib/components/school/shared/pickers/StaffPicker.svelte';
	import Button from '$lib/components/ui/button/button.svelte';
	import FormModal from '$lib/components/ui/FormModal.svelte';
	import Input from '$lib/components/ui/input/input.svelte';
	import Label from '$lib/components/ui/label/label.svelte';
	import PermissionGate from '$lib/components/ui/PermissionGate.svelte';
	import { t } from '$lib/i18n';
	import { Plus, Trash2 } from '$lib/icons';
	import { bindUrlModal, createUrlSyncedModals } from '$lib/modal/modal-state.svelte';
	import { pruneStaffAssignmentPermissions } from '$lib/school/staff-assignment-form-helpers';
	import { get } from 'svelte/store';
	import { getClassesPageState } from '../classes-page.svelte';

	type StaffAssignment = components['schemas']['StaffAssignment'];

	const { classGroup }: { classGroup: ClassNode } = $props();

	const classesPage = getClassesPageState();

	const modals = createUrlSyncedModals({ allowed: ['form'], getUrl: () => $page.url });
	$effect(() => {
		modals.hydrate();
	});
	const formOpen = bindUrlModal(modals, 'form');

	let editing = $state<StaffAssignment | null>(null);
	let deleteBusy = $state<string | null>(null);
	let formBusy = $state(false);
	let staffId = $state('');
	let responsibility = $state('');
	let permissions = $state<StaffAssignment['permissions']>([]);

	const rows = $derived(classesPage.staffAssignmentsForClassGroup(classGroup.id));
	const staff = $derived(classesPage.staff);
	const catalog = $derived(classesPage.permissionCatalog);
	const permissionEntries = $derived(catalogEntriesForClassGroupStaffAssignment(catalog));

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
		editing = null;
		resetForm(null);
		formOpen.open = true;
	}

	function openEdit(row: StaffAssignment) {
		editing = row;
		resetForm(row);
		formOpen.open = true;
	}

	$effect(() => {
		if (formOpen.open) {
			void classesPage.ensurePermissionCatalog();
		}
	});

	$effect(() => {
		const pruned = pruneStaffAssignmentPermissions(
			permissions,
			permissionEntries.map(entry => entry.permission),
		);
		if (pruned) {
			permissions = pruned;
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

	async function removeRow(row: StaffAssignment) {
		if (deleteBusy) {
			return;
		}
		deleteBusy = row.id;
		await classesPage.deleteStaffAssignment({
			id: row.id,
			successMessage: get(t)('classGroups.assignmentDeleted'),
		});
		deleteBusy = null;
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
								disabled={disabled || deleteBusy === row.id}
								onclick={() => removeRow(row)}
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
