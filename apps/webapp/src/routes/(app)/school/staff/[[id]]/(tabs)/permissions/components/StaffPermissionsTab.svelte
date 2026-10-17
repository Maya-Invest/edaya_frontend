<script lang="ts">
	import type { StaffPermissionAssignmentView } from '$lib/api/staff-permission-assignments-data';
	import type { StaffMember } from '$lib/types/school';
	import {
		formatPermissionLabel,

	} from '$lib/api/staff-permission-assignments-data';
	import { skippedPermissionsByProfile } from '$lib/api/staff-permission-profiles-data';
	import Button from '$lib/components/ui/button/button.svelte';
	import Label from '$lib/components/ui/label/label.svelte';
	import PermissionGate from '$lib/components/ui/PermissionGate.svelte';
	import { t } from '$lib/i18n';
	import { ChevronDown, ChevronUp, Pencil, Plus, ShieldCheck, Trash2 } from '$lib/icons';
	import PermissionScopeTypes from '$lib/smart-components/scope-builder/PermissionScopeTypes.svelte';
	import { get } from 'svelte/store';
	import { getStaffPageState } from '../../../../staff-page.svelte';
	import StaffScopeTags from './StaffScopeTags.svelte';

	const {
		s,
		onCreate,
		onEdit,
		onDelete,
		onApply,
		onEditProfile,
		onEditDefaults,
		onRemove,
	}: {
		s: StaffMember;
		onCreate: () => void;
		onEdit: (row: StaffPermissionAssignmentView) => void;
		onDelete: (row: StaffPermissionAssignmentView) => void;
		onApply: () => void;
		onEditProfile: (profileId: string) => void;
		onEditDefaults: () => void;
		onRemove: (profileId: string) => void;
	} = $props();

	const staffPage = getStaffPageState();
	const customRows = $derived(staffPage.customPermissionAssignmentsForStaff(s.id));
	const bindings = $derived(staffPage.permissionProfileBindingsForStaff(s.id));
	const expansionScope = $derived(`${s.id}:${staffPage.staffScope().schoolId}:${staffPage.staffScope().academicYearId}`);
	let expandedProfiles = $state<Record<string, boolean>>({});
	$effect(() => {
		if (expansionScope)
			expandedProfiles = {};
	});
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
	<div class="flex flex-wrap items-center justify-between gap-2">
		<div class="flex items-center gap-2">
			<ShieldCheck class="h-4 w-4 text-muted-foreground" />
			<Label class="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
				{$t('staff.permissionsTitle')}
			</Label>
		</div>
		<div class="flex flex-wrap items-center gap-2">
			<PermissionGate permission="ACCESS_CONTROL_MANAGE" mode="disable">
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
			<PermissionGate permission="ACCESS_CONTROL_MANAGE" mode="disable">
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

	<div data-testid="staff-default-scopes" class="flex items-start justify-between gap-3 rounded-xl border border-border bg-card p-4">
		<div class="min-w-0 flex-1"><p class="text-sm font-medium">{$t('staff.defaultScopes')}</p>
			<p class="text-xs text-muted-foreground">{$t('staff.defaultScopesSummary', { n: staffPage.staffDefaultScopes(s.id).length })}</p>
			<StaffScopeTags scopes={staffPage.staffDefaultScopeViews(s.id)} emptyLabel={$t('staff.noDefaultScopes')} />
		</div>
		<PermissionGate permission="ACCESS_CONTROL_MANAGE" mode="disable">{#snippet children({ disabled })}
			<Button variant="outline" size="sm" {disabled} onclick={onEditDefaults}>{$t('common.edit')}</Button>
		{/snippet}</PermissionGate>
	</div>
	{#each bindings as binding, index (binding.id)}
		{@const profile = staffPage.findPermissionProfile(binding.profileId)}
		{#if profile}
			{@const skipped = skippedByProfile.get(profile.id) ?? []}
			{@const skippedIds = new Set(skipped.map(entry => entry.permission))}
			{@const expanded = expandedProfiles[binding.id] ?? false}
			{@const warningCount = new Set([...(binding.warnings ?? []).filter(warning => warning.reason !== 'shadowed').map(warning => warning.permission), ...staffPage.permissionAssignmentsForStaff(s.id).filter(row => row.sourceProfileBindingId === binding.id && row.hasMissingScope).map(row => row.permission)]).size}
			<div data-testid="staff-permission-profile" data-profile-id={profile.id} class="overflow-hidden rounded-xl border border-border bg-card">
				<div class="px-4 py-3">
					<div class="flex flex-wrap items-start justify-between gap-2">
						<button type="button" class="flex min-h-11 min-w-0 flex-1 basis-40 items-center gap-2 rounded-lg text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary"
							aria-expanded={expanded} aria-controls={`profile-permissions-${binding.id}`}
							onclick={() => expandedProfiles = { ...expandedProfiles, [binding.id]: !expanded }}>
							<ChevronDown class={`h-4 w-4 shrink-0 transition-transform motion-reduce:transition-none ${expanded ? 'rotate-180' : ''}`} />
							<span class="min-w-0">
								<span class="flex flex-wrap items-center gap-x-2 gap-y-1">
									<span class="break-words text-sm font-medium">{profile.name}</span>
									{#if profile.permissions.some(permission => staffPage.permissionCatalog.some(entry => entry.permission === permission && entry.scopePolicy.mode === 'resources'))}
										<StaffScopeTags inline scopes={staffPage.profileEffectiveScopes(binding.id)} emptyLabel={$t('staff.noEffectiveScopes')} />
									{/if}
								</span>
								<span class="block text-xs text-muted-foreground">{$t('staff.profilePermissionCount', { n: profile.permissions.length })}</span>
							</span>
						</button>
						<PermissionGate permission="ACCESS_CONTROL_MANAGE" mode="disable">
							{#snippet children({ disabled })}
								<div class="ml-auto flex shrink-0 items-center gap-1">
									<Button variant="ghost" size="icon" class="h-11 w-11 rounded-full" {disabled}
										aria-label={$t('common.edit')} onclick={() => onEditProfile(profile.id)}><Pencil class="h-4 w-4" /></Button>
									<Button
										variant="ghost"
										size="icon"
										class="h-11 w-11 rounded-full"
										disabled={disabled || index === 0}
										aria-label={$t('staff.reorderProfileUp')}
										onclick={() => move(index, -1)}
									>
										<ChevronUp class="h-4 w-4" />
									</Button>
									<Button
										variant="ghost"
										size="icon"
										class="h-11 w-11 rounded-full"
										disabled={disabled || index === bindings.length - 1}
										aria-label={$t('staff.reorderProfileDown')}
										onclick={() => move(index, 1)}
									>
										<ChevronDown class="h-4 w-4" />
									</Button>
									<Button
										variant="ghost"
										size="icon"
										class="h-11 w-11 rounded-full"
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
					{#if warningCount > 0}
						<p data-testid="profile-scope-warning-summary" class="mt-2 text-xs text-highlight">{$t('staff.profileScopeWarnings', { n: warningCount })}</p>
					{/if}
				</div>
				<ul id={`profile-permissions-${binding.id}`} hidden={!expanded} class="divide-y divide-border/60 border-t border-border/60">
					{#each profile.permissions as permission (permission)}
						<li class="px-4 py-2.5">
							<div class="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm font-medium {skippedIds.has(permission) ? 'text-muted-foreground' : ''}">
								<span>{formatPermissionLabel(permission, $t)}</span>
								<PermissionScopeTypes entry={staffPage.permissionCatalog.find(entry => entry.permission === permission)} />
							</div>
							{#each (binding.warnings ?? []).filter(row => row.permission === permission && row.reason !== 'shadowed') as warning, warningIndex (warningIndex)}
								<p data-testid="permission-scope-warning" data-reason={warning.reason} class="mt-0.5 text-xs text-highlight">{$t(`staff.scopeWarning.${warning.reason}`)}</p>
							{/each}
							{#if staffPage.permissionAssignmentsForStaff(s.id).some(row => row.sourceProfileBindingId === binding.id && row.permission === permission && row.hasMissingScope)}
								<p class="mt-0.5 text-xs text-highlight">{$t('roles.staleScopeWarning')}</p>
							{/if}
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
								<div class="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm font-medium">
									<span>{formatPermissionLabel(row.permission, $t)}</span>
									<PermissionScopeTypes entry={staffPage.permissionCatalog.find(entry => entry.permission === row.permission)} />
								</div>
								{#if row.useDefaultScopes}<p class="text-xs text-muted-foreground">{$t('staff.includeDefaultScopes')}</p>{/if}
								{#each row.warnings ?? [] as warning, warningIndex (warningIndex)}<p data-testid="permission-scope-warning" data-reason={warning.reason} class="text-xs text-highlight">{$t(`staff.scopeWarning.${warning.reason}`)}</p>{/each}
								<div class="mt-1 text-xs text-muted-foreground">
									{row.scopeLabel}
									{#if row.hasMissingScope}
										<span class="ml-1 text-highlight">{$t('roles.staleScopeWarning')}</span>
									{/if}
								</div>
							</div>
							<PermissionGate permission="ACCESS_CONTROL_MANAGE" mode="disable">
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
