<script lang="ts">
	import type { StaffPermissionAssignmentView } from '$lib/api/staff-permission-assignments-data';
	import type { StaffMember } from '$lib/types/school';
	import {
		deleteStaffPermissionAssignmentMutation,
	} from '$lib/api/mutations/staff-permission-assignments.mutations';
	import {
		formatPermissionLabel,
	} from '$lib/api/staff-permission-assignments-data';
	import Button from '$lib/components/ui/button/button.svelte';
	import PermissionGate from '$lib/components/ui/PermissionGate.svelte';
	import { detailDataContext } from '$lib/detail-data/context.svelte';
	import { t } from '$lib/i18n';
	import { Plus, ShieldCheck, Trash2 } from '$lib/icons';
	import { cn } from '$lib/utils';
	import { get } from 'svelte/store';
	import { ROLE_TINT } from '../shared/drawer-constants';
	import PersonAvatar from '../shared/PersonAvatar.svelte';
	import StaffPermissionFormModal from './StaffPermissionFormModal.svelte';

	const { staff }: { staff: StaffMember } = $props();

	let formOpen = $state(false);
	let editing = $state<StaffPermissionAssignmentView | null>(null);
	let deleteBusy = $state<string | null>(null);

	const rows = $derived(detailDataContext.assignmentsForStaff(staff.id));

	function openCreate() {
		editing = null;
		formOpen = true;
	}

	async function removeRow(row: StaffPermissionAssignmentView) {
		if (row.isSynced || deleteBusy) {
			return;
		}
		deleteBusy = row.id;
		await deleteStaffPermissionAssignmentMutation({
			id: row.id,
			successMessage: get(t)('roles.permissionDeleted', {
				permission: formatPermissionLabel(row.permission, get(t)),
			}),
		});
		deleteBusy = null;
	}
</script>

<div class="space-y-6">
	<div class={cn('rounded-2xl border border-border p-5', ROLE_TINT[staff.role])}>
		<div class="flex items-center gap-3">
			<PersonAvatar
				name={staff.name}
				initials={staff.initials}
				photoUrl={staff.photoUrl}
				size="lg"
			/>
			<div>
				<div class="font-mono text-[10px] uppercase tracking-[0.18em] opacity-70">
					{$t('roles.staffPermissions')}
				</div>
				<div class="font-display text-xl font-semibold tracking-tight">{staff.name}</div>
				<div class="text-xs opacity-80">
					{$t(`staff.role.${staff.role}`)} · {$t('roles.permissionRows', { n: rows.length })}
				</div>
			</div>
		</div>
	</div>

	<div class="flex items-center justify-between gap-2">
		<div class="flex items-center gap-2">
			<ShieldCheck class="h-4 w-4 text-muted-foreground" />
			<h3 class="font-display text-base font-semibold">{$t('roles.permissionMatrixTitle')}</h3>
		</div>
		<PermissionGate permission="ACCESS_CONTROL_ASSIGN" mode="disable">
			{#snippet children({ disabled })}
				<Button
					size="sm"
					class="rounded-full"
					disabled={disabled}
					onclick={openCreate}
				>
					<Plus class="mr-1.5 h-3.5 w-3.5" />
					{$t('roles.addPermission')}
				</Button>
			{/snippet}
		</PermissionGate>
	</div>

	<div class="overflow-hidden rounded-xl border border-border bg-card">
		{#if rows.length === 0}
			<p class="px-4 py-8 text-center text-sm text-muted-foreground">
				{$t('roles.noPermissionsForStaff')}
			</p>
		{:else}
			<ul class="divide-y divide-border/60">
				{#each rows as row (row.id)}
					<li class="flex items-start justify-between gap-3 px-4 py-3">
						<div class="min-w-0 flex-1">
							<div class="text-sm font-medium">{formatPermissionLabel(row.permission, $t)}</div>
							<div class="mt-1 text-xs text-muted-foreground">
								{row.scopeLabel}
								{#if row.hasMissingScope}
									<span class="ml-1 text-amber-600">{$t('roles.staleScopeWarning')}</span>
								{/if}
							</div>
							{#if row.isSynced}
								<div class="mt-1.5 inline-flex items-center gap-1 rounded-full border border-border bg-muted/50 px-2 py-0.5 text-[10px] text-muted-foreground">
									{$t('roles.syncedFromAssignment')}
								</div>
							{/if}
						</div>
						{#if !row.isSynced}
							<PermissionGate permission="ACCESS_CONTROL_ASSIGN" mode="disable">
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
						{/if}
					</li>
				{/each}
			</ul>
		{/if}
	</div>
</div>

<StaffPermissionFormModal bind:open={formOpen} {staff} assignment={editing} />
