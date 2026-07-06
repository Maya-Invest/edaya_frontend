<script lang="ts">
	import type { components } from '$lib/api/schema';
	import type { StaffMember } from '$lib/types/school';
	import { page } from '$app/stores';
	import { academicContext } from '$lib/academic/context.svelte';
	import { deleteStaffAssignmentMutation } from '$lib/api/mutations/staff-assignments.mutations';
	import { formatPermissionLabel } from '$lib/api/staff-permission-assignments-data';
	import Button from '$lib/components/ui/button/button.svelte';
	import PermissionGate from '$lib/components/ui/PermissionGate.svelte';
	import { detailDataContext } from '$lib/detail-data/context.svelte';
	import { t } from '$lib/i18n';
	import { Plus, Trash2 } from '$lib/icons';
	import { bindUrlModal, createUrlSyncedModals } from '$lib/modal/modal-state.svelte';
	import { get } from 'svelte/store';
	import StaffAssignmentFormModal from './StaffAssignmentFormModal.svelte';

	const { staff }: { staff: StaffMember } = $props();

	const modals = createUrlSyncedModals({ allowed: ['form'], getUrl: () => $page.url });
	$effect(() => {
		modals.hydrate();
	});
	const formOpen = bindUrlModal(modals, 'form');

	let editing = $state<components['schemas']['StaffAssignment'] | null>(null);
	let deleteBusy = $state<string | null>(null);

	const rows = $derived(detailDataContext.staffAssignmentsForStaff(staff.id));

	function classLabel(classGroupId: string | null | undefined): string {
		if (!classGroupId) {
			return '—';
		}
		return academicContext.classes.find(entry => entry.id === classGroupId)?.name ?? classGroupId;
	}

	function subjectLabel(classSubjectId: string | null | undefined): string {
		if (!classSubjectId) {
			return '';
		}
		return detailDataContext.subjects.find(subject => subject.id === classSubjectId)?.name ?? classSubjectId;
	}

	function targetLabel(row: components['schemas']['StaffAssignment']): string {
		if (row.classSubjectId) {
			const subject = detailDataContext.subjects.find(entry => entry.id === row.classSubjectId);
			const className = classLabel(subject?.classId);
			return `${className} · ${subjectLabel(row.classSubjectId)}`;
		}
		return classLabel(row.classGroupId);
	}

	function openCreate() {
		editing = null;
		formOpen.open = true;
	}

	async function removeRow(row: components['schemas']['StaffAssignment']) {
		if (deleteBusy) {
			return;
		}
		deleteBusy = row.id;
		await deleteStaffAssignmentMutation({
			id: row.id,
			successMessage: get(t)('staff.assignmentDeleted'),
		});
		deleteBusy = null;
	}
</script>

<div class="space-y-3">
	<div class="flex items-center justify-between gap-2">
		<div>
			<h4 class="text-sm font-semibold">{$t('staff.assignmentsTitle')}</h4>
			<p class="text-xs text-muted-foreground">{$t('staff.assignmentsHint')}</p>
		</div>
		<PermissionGate permission="STAFF_UPDATE" mode="disable">
			{#snippet children({ disabled })}
				<Button size="sm" class="rounded-full" disabled={disabled} onclick={openCreate}>
					<Plus class="mr-1.5 h-3.5 w-3.5" />
					{$t('staff.addAssignment')}
				</Button>
			{/snippet}
		</PermissionGate>
	</div>

	{#if rows.length === 0}
		<p class="text-sm text-muted-foreground">{$t('staff.noAssignments')}</p>
	{:else}
		<ul class="divide-y divide-border/60 overflow-hidden rounded-xl border border-border bg-card">
			{#each rows as row (row.id)}
				<li class="flex items-start justify-between gap-3 px-4 py-3">
					<div class="min-w-0 flex-1">
						<div class="text-sm font-medium">{row.responsibility}</div>
						<div class="mt-1 text-xs text-muted-foreground">{targetLabel(row)}</div>
						{#if (row.permissions ?? []).length > 0}
							<div class="mt-2 flex flex-wrap gap-1">
								{#each row.permissions ?? [] as permission (permission)}
									<span class="rounded-full bg-muted px-2 py-0.5 text-[10px] text-muted-foreground">
										{formatPermissionLabel(permission, $t)}
									</span>
								{/each}
							</div>
						{:else}
							<p class="mt-1 text-[11px] text-muted-foreground">{$t('staff.placementOnlyAssignment')}</p>
						{/if}
					</div>
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

<StaffAssignmentFormModal bind:open={formOpen.open} {staff} assignment={editing} />
