<script lang="ts">
	import type { components } from '$lib/api/schema';
	import type { ClassNode } from '$lib/types/school';
	import { page } from '$app/stores';
	import { deleteStaffAssignmentMutation } from '$lib/api/mutations/staff-assignments.mutations';
	import { formatPermissionLabel } from '$lib/api/staff-permission-assignments-data';
	import Button from '$lib/components/ui/button/button.svelte';
	import PermissionGate from '$lib/components/ui/PermissionGate.svelte';
	import { detailDataContext } from '$lib/detail-data/context.svelte';
	import { t } from '$lib/i18n';
	import { Plus, Trash2 } from '$lib/icons';
	import { bindUrlModal, createUrlSyncedModals } from '$lib/modal/modal-state.svelte';
	import { get } from 'svelte/store';
	import ClassGroupStaffAssignmentFormModal from './ClassGroupStaffAssignmentFormModal.svelte';

	type StaffAssignment = components['schemas']['StaffAssignment'];

	const { classGroup }: { classGroup: ClassNode } = $props();

	const modals = createUrlSyncedModals({ allowed: ['form'], getUrl: () => $page.url });
	$effect(() => {
		modals.hydrate();
	});
	const formOpen = bindUrlModal(modals, 'form');

	let editing = $state<StaffAssignment | null>(null);
	let deleteBusy = $state<string | null>(null);

	const rows = $derived(detailDataContext.staffAssignmentsForClassGroup(classGroup.id));

	function staffName(staffId: string): string {
		return detailDataContext.staff.find(member => member.id === staffId)?.name ?? staffId;
	}

	function openCreate() {
		editing = null;
		formOpen.open = true;
	}

	function openEdit(row: StaffAssignment) {
		editing = row;
		formOpen.open = true;
	}

	async function removeRow(row: StaffAssignment) {
		if (deleteBusy) {
			return;
		}
		deleteBusy = row.id;
		await deleteStaffAssignmentMutation({
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

<ClassGroupStaffAssignmentFormModal
	bind:open={formOpen.open}
	classGroupId={classGroup.id}
	assignment={editing}
/>
