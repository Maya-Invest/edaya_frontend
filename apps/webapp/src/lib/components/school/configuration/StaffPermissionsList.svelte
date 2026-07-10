<script lang="ts">
	import type { StaffPermissionAssignmentView } from '$lib/api/staff-permission-assignments-data';
	import type { StaffMember } from '$lib/types/school';
	import { ApiError } from '$api-client';
	import { academicContext } from '$lib/academic/context.svelte';
	import {
		deleteStaffPermissionAssignmentMutation,
	} from '$lib/api/mutations/staff-permission-assignments.mutations';
	import { getBrowserSchoolClient } from '$lib/api/school-client';
	import {
		formatPermissionLabel,
		loadStaffPermissionPageData,
	} from '$lib/api/staff-permission-assignments-data';
	import { authSession } from '$lib/auth/session.svelte';
	import Button from '$lib/components/ui/button/button.svelte';
	import Label from '$lib/components/ui/label/label.svelte';
	import PermissionGate from '$lib/components/ui/PermissionGate.svelte';
	import { detailDataContext } from '$lib/detail-data/context.svelte';
	import { t } from '$lib/i18n';
	import { Pencil, Plus, ShieldCheck, Trash2 } from '$lib/icons';
	import { getDrawerUrlModals } from '$lib/modal/drawer-url-modals.svelte';
	import { get } from 'svelte/store';

	let {
		s,
		editing = $bindable(null),
	}: {
		s: StaffMember;
		editing?: StaffPermissionAssignmentView | null;
	} = $props();

	const modals = getDrawerUrlModals();

	let deleteBusy = $state<string | null>(null);
	let loadingKey = $state<string | null>(null);
	let loadError = $state(false);

	const schoolId = $derived(authSession.schoolId ?? academicContext.schools[0]?.id ?? '');
	const academicYearId = $derived(academicContext.yearId);
	const permissionDataKey = $derived(schoolId && academicYearId ? `${schoolId}:${academicYearId}` : '');
	const loading = $derived(Boolean(permissionDataKey && loadingKey === permissionDataKey));
	const rows = $derived(detailDataContext.assignmentsForStaff(s.id));

	async function loadPermissionData(key: string, targetSchoolId: string, targetAcademicYearId: string) {
		loadingKey = key;
		loadError = false;
		try {
			const data = await loadStaffPermissionPageData(
				getBrowserSchoolClient(),
				{ schoolId: targetSchoolId, academicYearId: targetAcademicYearId },
				get(t),
			);
			if (permissionDataKey === key) {
				detailDataContext.seedStaffPermissionData(data, key);
			}
		}
		catch (error) {
			if (error instanceof ApiError && (error.status === 403 || error.status === 401)) {
				detailDataContext.seedStaffPermissionData({ assignments: [], catalog: [] }, key);
			}
			else if (permissionDataKey === key) {
				loadError = true;
			}
		}
		finally {
			if (loadingKey === key) {
				loadingKey = null;
			}
		}
	}

	$effect(() => {
		const key = permissionDataKey;
		if (!key || detailDataContext.hasStaffPermissionData(key) || loadingKey === key) {
			return;
		}
		void loadPermissionData(key, schoolId, academicYearId);
	});

	function openCreate() {
		editing = null;
		modals?.open('add-permission');
	}

	function openEdit(row: StaffPermissionAssignmentView) {
		editing = row;
		modals?.open('add-permission');
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

<div class="space-y-3">
	<div class="flex items-center justify-between gap-2">
		<div class="flex items-center gap-2">
			<ShieldCheck class="h-4 w-4 text-muted-foreground" />
			<Label class="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
				{$t('staff.permissionsTitle', { role: $t(`staff.role.${s.role}`) })}
			</Label>
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
	<p class="text-[11px] text-muted-foreground">
		{$t('staff.permissionsHint')}
	</p>

	<div class="overflow-hidden rounded-xl border border-border bg-card" aria-busy={loading}>
		{#if loading}
			<p class="px-4 py-8 text-center text-sm text-muted-foreground">
				{$t('dataState.loading')}
			</p>
		{:else if loadError}
			<p class="px-4 py-8 text-center text-sm text-muted-foreground">
				{$t('dataState.errorDefault')}
			</p>
		{:else if rows.length === 0}
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
									<div class="flex shrink-0 items-center gap-1">
										<Button
											variant="ghost"
											size="icon"
											class="h-8 w-8 rounded-full"
											disabled={disabled || deleteBusy === row.id}
											aria-label={$t('roles.editPermission')}
											onclick={() => openEdit(row)}
										>
											<Pencil class="h-4 w-4" />
										</Button>
										<Button
											variant="ghost"
											size="icon"
											class="h-8 w-8 rounded-full"
											disabled={disabled || deleteBusy === row.id}
											aria-label={$t('common.delete')}
											onclick={() => removeRow(row)}
										>
											<Trash2 class="h-4 w-4" />
										</Button>
									</div>
								{/snippet}
							</PermissionGate>
						{/if}
					</li>
				{/each}
			</ul>
		{/if}
	</div>
</div>
