<script lang="ts">
	import type { StaffMember } from '$lib/types/school';
	import { profileGrainLabelKey } from '$lib/api/grant-scopes';
	import {
		formatPermissionLabel,
		type StaffPermissionAssignmentView,
	} from '$lib/api/staff-permission-assignments-data';
	import { skippedPermissionsByProfile } from '$lib/api/staff-permission-profiles-data';
	import Button from '$lib/components/ui/button/button.svelte';
	import Label from '$lib/components/ui/label/label.svelte';
	import PermissionGate from '$lib/components/ui/PermissionGate.svelte';
	import { t } from '$lib/i18n';
	import { ChevronDown, ChevronUp, Pencil, Plus, ShieldCheck, Trash2 } from '$lib/icons';
	import { get } from 'svelte/store';
	import { getStaffPageState } from '../../../../staff-page.svelte';

	const {
		s,
		onCreate,
		onEdit,
		onDelete,
		onApply,
		onRemove,
	}: {
		s: StaffMember;
		onCreate: () => void;
		onEdit: (row: StaffPermissionAssignmentView) => void;
		onDelete: (row: StaffPermissionAssignmentView) => void;
		onApply: () => void;
		onRemove: (profileId: string) => void;
	} = $props();

	const staffPage = getStaffPageState();
	const customRows = $derived(staffPage.customPermissionAssignmentsForStaff(s.id));
	const bindings = $derived(staffPage.permissionProfileBindingsForStaff(s.id));
	const skippedByProfile = $derived.by(() => {
		const profiles = bindings
			.map(binding => staffPage.findPermissionProfile(binding.profileId))
			.filter((profile): profile is NonNullable<typeof profile> => Boolean(profile));
		return skippedPermissionsByProfile(profiles, bindings);
	});

	async function move(index: number, direction: -1 | 1) {
		const next = index + direction;
		if (next < 0 || next >= bindings.length) {
			return;
		}
		const ids = bindings.map(binding => binding.profileId);
		const current = ids[index];
		const swap = ids[next];
		if (!current || !swap) {
			return;
		}
		ids[index] = swap;
		ids[next] = current;
		await staffPage.reorderPermissionProfiles({
			staffId: s.id,
			profileIds: ids,
			successMessage: get(t)('staff.profileReordered'),
		});
	}
</script>

<div class="space-y-4">
	<div class="flex items-center justify-between gap-2">
		<div class="flex items-center gap-2">
			<ShieldCheck class="h-4 w-4 text-muted-foreground" />
			<Label class="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
				{$t('staff.permissionsTitle')}
			</Label>
		</div>
		<div class="flex items-center gap-2">
			<PermissionGate permission="ACCESS_CONTROL_ASSIGN" mode="disable">
				{#snippet children({ disabled })}
					<Button
						size="sm"
						variant="outline"
						class="rounded-full"
						disabled={disabled}
						onclick={onApply}
					>
						{$t('staff.applyProfile')}
					</Button>
				{/snippet}
			</PermissionGate>
			<PermissionGate permission="ACCESS_CONTROL_ASSIGN" mode="disable">
				{#snippet children({ disabled })}
					<Button
						size="sm"
						class="rounded-full"
						disabled={disabled}
						onclick={onCreate}
					>
						<Plus class="mr-1.5 h-3.5 w-3.5" />
						{$t('roles.addPermission')}
					</Button>
				{/snippet}
			</PermissionGate>
		</div>
	</div>
	<p class="text-[11px] text-muted-foreground">
		{$t('staff.permissionsHint')}
	</p>

	{#each bindings as binding, index (binding.id)}
		{@const profile = staffPage.findPermissionProfile(binding.profileId)}
		{#if profile}
			{@const skipped = skippedByProfile.get(profile.id) ?? []}
			{@const skippedIds = new Set(skipped.map(entry => entry.permission))}
			<div class="overflow-hidden rounded-xl border border-border bg-card">
				<div class="flex items-start justify-between gap-3 border-b border-border/60 px-4 py-3">
					<div class="min-w-0">
						<p class="truncate text-sm font-medium">{profile.name}</p>
						<p class="mt-0.5 text-xs text-muted-foreground">
							{$t(profileGrainLabelKey(profile.scopeGrain))}
							· {staffPage.bindingScopeLabels[binding.id] ?? '—'}
						</p>
					</div>
					<PermissionGate permission="ACCESS_CONTROL_ASSIGN" mode="disable">
						{#snippet children({ disabled })}
							<div class="flex shrink-0 items-center gap-1">
								<Button
									variant="ghost"
									size="icon"
									class="h-8 w-8 rounded-full"
									disabled={disabled || index === 0}
									aria-label={$t('staff.reorderProfileUp')}
									onclick={() => move(index, -1)}
								>
									<ChevronUp class="h-4 w-4" />
								</Button>
								<Button
									variant="ghost"
									size="icon"
									class="h-8 w-8 rounded-full"
									disabled={disabled || index === bindings.length - 1}
									aria-label={$t('staff.reorderProfileDown')}
									onclick={() => move(index, 1)}
								>
									<ChevronDown class="h-4 w-4" />
								</Button>
								<Button
									variant="ghost"
									size="icon"
									class="h-8 w-8 rounded-full"
									{disabled}
									aria-label={$t('staff.removeProfile')}
									onclick={() => onRemove(profile.id)}
								>
									<Trash2 class="h-4 w-4" />
								</Button>
							</div>
						{/snippet}
					</PermissionGate>
				</div>
				<ul class="divide-y divide-border/60">
					{#each profile.permissions as permission (permission)}
						<li class="px-4 py-2.5">
							<div class="text-sm font-medium {skippedIds.has(permission) ? 'text-muted-foreground' : ''}">
								{formatPermissionLabel(permission, $t)}
							</div>
							{#if skippedIds.has(permission)}
								{@const owner = skipped.find(entry => entry.permission === permission)}
								<p class="mt-0.5 text-xs text-muted-foreground">
									{$t('staff.skippedPermission', {
										name: staffPage.findPermissionProfile(owner?.ownerProfileId ?? '')?.name ?? '',
									})}
								</p>
							{/if}
						</li>
					{/each}
				</ul>
			</div>
		{/if}
	{/each}

	<div class="space-y-2">
		<Label class="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
			{$t('staff.additionalPermissions')}
		</Label>
		<div class="overflow-hidden rounded-xl border border-border bg-card">
			{#if customRows.length === 0 && bindings.length === 0}
				<p class="px-4 py-8 text-center text-sm text-muted-foreground">
					{$t('roles.noPermissionsForStaff')}
				</p>
			{:else if customRows.length === 0}
				<p class="px-4 py-6 text-center text-sm text-muted-foreground">
					{$t('roles.noPermissionsForStaff')}
				</p>
			{:else}
				<ul class="divide-y divide-border/60">
					{#each customRows as row (row.id)}
						<li class="flex items-start justify-between gap-3 px-4 py-3">
							<div class="min-w-0 flex-1">
								<div class="text-sm font-medium">{formatPermissionLabel(row.permission, $t)}</div>
								<div class="mt-1 text-xs text-muted-foreground">
									{row.scopeLabel}
									{#if row.hasMissingScope}
										<span class="ml-1 text-highlight">{$t('roles.staleScopeWarning')}</span>
									{/if}
								</div>
							</div>
							<PermissionGate permission="ACCESS_CONTROL_ASSIGN" mode="disable">
								{#snippet children({ disabled })}
									<div class="flex shrink-0 items-center gap-1">
										<Button
											variant="ghost"
											size="icon"
											class="h-8 w-8 rounded-full"
											{disabled}
											aria-label={$t('roles.editPermission')}
											onclick={() => onEdit(row)}
										>
											<Pencil class="h-4 w-4" />
										</Button>
										<Button
											variant="ghost"
											size="icon"
											class="h-8 w-8 rounded-full"
											{disabled}
											aria-label={$t('common.delete')}
											onclick={() => onDelete(row)}
										>
											<Trash2 class="h-4 w-4" />
										</Button>
									</div>
								{/snippet}
							</PermissionGate>
						</li>
					{/each}
				</ul>
			{/if}
		</div>
	</div>
</div>
