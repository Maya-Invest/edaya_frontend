<script lang="ts">
	import type { ProfileScopeGrain } from '$lib/api/grant-scopes';
	import type { StaffPermissionCode, StaffPermissionProfile } from '$lib/api/staff-permission-profiles-data';
	import { PROFILE_SCOPE_GRAINS, profileGrainLabelKey } from '$lib/api/grant-scopes';
	import { formatPermissionLabel } from '$lib/api/staff-permission-assignments-data';
	import {
		groupCatalogEntries,
		permissionsForGrain,

	} from '$lib/api/staff-permission-profiles-data';
	import Checkbox from '$lib/components/ui/checkbox/checkbox.svelte';
	import FormModal from '$lib/components/ui/FormModal.svelte';
	import Input from '$lib/components/ui/input/input.svelte';
	import * as Select from '$lib/components/ui/select';
	import { t } from '$lib/i18n';
	import { Lock } from '$lib/icons';
	import { get } from 'svelte/store';
	import { getPermissionProfilesPageState } from '../permission-profiles-page.svelte';

	let {
		open = $bindable(false),
		profile = null,
	}: {
		open?: boolean;
		profile?: StaffPermissionProfile | null;
	} = $props();

	const permissionProfilesPage = getPermissionProfilesPageState();

	let busy = $state(false);
	let name = $state('');
	let description = $state('');
	let scopeGrain = $state<ProfileScopeGrain>('school');
	let permissions = $state<StaffPermissionCode[]>([]);

	const isEdit = $derived(profile !== null && profile !== undefined);
	const boundCount = $derived(profile ? permissionProfilesPage.boundCount(profile.id) : 0);
	const grainLocked = $derived(isEdit && boundCount > 0);
	const grainEntries = $derived(permissionsForGrain(permissionProfilesPage.catalog, scopeGrain));
	const groupedEntries = $derived(groupCatalogEntries(grainEntries));
	const canSubmit = $derived(name.trim().length > 0);
	const saveDescription = $derived(
		boundCount > 0
			? $t('permissionProfiles.saveUpdatesStaff', { n: boundCount })
			: $t('permissionProfiles.subtitle'),
	);

	function grainLabel(value: ProfileScopeGrain): string {
		return get(t)(profileGrainLabelKey(value));
	}

	function setGrain(next: ProfileScopeGrain) {
		if (grainLocked || next === scopeGrain) {
			return;
		}
		const allowed = new Set(permissionsForGrain(permissionProfilesPage.catalog, next).map(entry => entry.permission));
		scopeGrain = next;
		permissions = permissions.filter(permission => allowed.has(permission));
	}

	function togglePermission(permission: StaffPermissionCode, checked: boolean) {
		if (checked) {
			if (!permissions.includes(permission)) {
				permissions = [...permissions, permission];
			}
			return;
		}
		permissions = permissions.filter(entry => entry !== permission);
	}

	function resetForm() {
		if (profile) {
			name = profile.name;
			description = profile.description ?? '';
			scopeGrain = profile.scopeGrain;
			permissions = [...profile.permissions];
			return;
		}
		name = '';
		description = '';
		scopeGrain = 'school';
		permissions = [];
	}

	$effect(() => {
		if (open) {
			resetForm();
		}
	});

	async function submit() {
		if (!canSubmit || busy) {
			return;
		}

		busy = true;
		try {
			const trimmedName = name.trim();
			const payload = {
				name: trimmedName,
				description: description.trim() || undefined,
				scopeGrain,
				permissions,
			};

			const ok = isEdit && profile
				? await permissionProfilesPage.saveProfile({
					id: profile.id,
					...payload,
					successMessage: get(t)('permissionProfiles.toastUpdated', { name: trimmedName }),
				})
				: await permissionProfilesPage.saveProfile({
					...payload,
					successMessage: get(t)('permissionProfiles.toastCreated', { name: trimmedName }),
				});

			if (ok) {
				open = false;
			}
		}
		finally {
			busy = false;
		}
	}
</script>

<FormModal
	bind:open
	title={isEdit ? $t('permissionProfiles.editTitle') : $t('permissionProfiles.add')}
	description={saveDescription}
	submitLabel={$t('academic.save')}
	cancelLabel={$t('academic.cancel')}
	contentClass="max-w-2xl"
	{busy}
	submitDisabled={!canSubmit}
	onSubmit={submit}
>
	<label class="grid gap-1 text-sm">
		<span class="text-muted-foreground">{$t('permissionProfiles.name')}</span>
		<Input bind:value={name} />
	</label>
	<label class="grid gap-1 text-sm">
		<span class="text-muted-foreground">{$t('permissionProfiles.description')}</span>
		<Input bind:value={description} />
	</label>
	<div class="grid gap-1 text-sm">
		<span class="text-muted-foreground">{$t('permissionProfiles.grain')}</span>
		{#if grainLocked}
			<div class="flex items-center gap-2 rounded-xl border border-border bg-secondary/40 px-3 py-2 text-sm">
				<Lock class="h-3.5 w-3.5 text-muted-foreground" />
				<span>{grainLabel(scopeGrain)}</span>
			</div>
			<p class="text-xs text-muted-foreground">{$t('permissionProfiles.grainLocked')}</p>
		{:else}
			<Select.Root type="single" value={scopeGrain} onValueChange={v => v && setGrain(v as ProfileScopeGrain)}>
				<Select.Trigger class="w-full">
					<Select.Value placeholder={$t('permissionProfiles.grain')}>
						{grainLabel(scopeGrain)}
					</Select.Value>
				</Select.Trigger>
				<Select.Content>
					{#each PROFILE_SCOPE_GRAINS as grain (grain)}
						<Select.Item value={grain} label={grainLabel(grain)}>
							{grainLabel(grain)}
						</Select.Item>
					{/each}
				</Select.Content>
			</Select.Root>
		{/if}
	</div>
	<div class="space-y-3">
		<p class="text-xs text-muted-foreground">{$t('permissionProfiles.checklistHint')}</p>
		{#each groupedEntries as group (group.key)}
			<div class="space-y-2">
				<p class="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">{group.key}</p>
				<div class="space-y-1.5">
					{#each group.entries as entry (entry.permission)}
						<label class="flex items-start gap-2 rounded-lg px-1 py-1 text-sm">
							<Checkbox
								checked={permissions.includes(entry.permission)}
								onCheckedChange={(checked) => {
									if (typeof checked === 'boolean') {
										togglePermission(entry.permission, checked);
									}
								}}
							/>
							<span>{formatPermissionLabel(entry.permission, $t)}</span>
						</label>
					{/each}
				</div>
			</div>
		{/each}
	</div>
</FormModal>
