<script lang="ts">
	import {
		defaultScopesForProfileGrain,
		profileGrainLabelKey,
		validGrantScopes,
		type GrantScope,
	} from '$lib/api/grant-scopes';
	import type { StaffPermissionProfile } from '$lib/api/staff-permission-profiles-data';
	import FormModal from '$lib/components/ui/FormModal.svelte';
	import Label from '$lib/components/ui/label/label.svelte';
	import { t } from '$lib/i18n';
	import ScopeBuilder from '$lib/smart-components/scope-builder/ScopeBuilder.svelte';
	import { get } from 'svelte/store';
	import { getStaffPageState } from '../../../../staff-page.svelte';

	let {
		open = $bindable(false),
		staffId,
	}: {
		open?: boolean;
		staffId: string;
	} = $props();

	const staffPage = getStaffPageState();

	let busy = $state(false);
	let profileId = $state('');
	let scopes = $state<GrantScope[]>([]);

	const profiles = $derived(staffPage.staffPermissionProfiles);
	const selected = $derived(profiles.find(profile => profile.id === profileId) ?? null);
	const grain = $derived(selected?.scopeGrain ?? 'school');
	const requiresScope = $derived(Boolean(selected) && grain !== 'school');
	const builderGrain = $derived(grain !== 'school' ? grain : null);
	const canSubmit = $derived(Boolean(selected) && validGrantScopes(
		requiresScope ? scopes : [{ kind: 'school' }],
		builderGrain ?? undefined,
	));

	function resetForm() {
		profileId = '';
		scopes = [];
	}

	function onProfileChange(nextId: string) {
		profileId = nextId;
		const profile = profiles.find(entry => entry.id === nextId);
		scopes = profile ? defaultScopesForProfileGrain(profile.scopeGrain) : [];
	}

	$effect(() => {
		if (open) {
			resetForm();
		}
	});

	async function submit() {
		if (!canSubmit || !selected || busy) {
			return;
		}
		busy = true;
		try {
			const ok = await staffPage.applyPermissionProfile({
				staffId,
				profileId: selected.id,
				scopes: grain === 'school' ? [{ kind: 'school' }] : scopes,
				successMessage: get(t)('staff.profileApplied', { name: selected.name }),
			});
			if (ok) {
				open = false;
			}
		}
		finally {
			busy = false;
		}
	}

	function profileLabel(profile: StaffPermissionProfile): string {
		return `${profile.name} · ${get(t)(profileGrainLabelKey(profile.scopeGrain))}`;
	}
</script>

<FormModal
	bind:open
	title={$t('staff.applyProfileTitle')}
	description={$t('staff.applyProfileHint')}
	submitLabel={$t('common.save')}
	{busy}
	submitDisabled={!canSubmit}
	onSubmit={submit}
>
	<div class="space-y-4">
		<div class="space-y-2">
			<Label for="apply-profile-select">{$t('staff.selectProfile')}</Label>
			<select
				id="apply-profile-select"
				value={profileId}
				onchange={event => onProfileChange(event.currentTarget.value)}
				class="h-10 w-full rounded-xl border border-border bg-background px-3 text-sm"
			>
				<option value="">{$t('staff.selectProfile')}</option>
				{#each profiles as profile (profile.id)}
					<option value={profile.id}>{profileLabel(profile)}</option>
				{/each}
			</select>
			{#if profiles.length === 0}
				<p class="text-xs text-muted-foreground">{$t('staff.noProfiles')}</p>
			{/if}
		</div>

		{#if builderGrain && selected}
			<div class="space-y-2">
				<Label>{$t('roles.scopeField')}</Label>
				<ScopeBuilder grain={builderGrain} bind:scopes active={open} />
			</div>
		{:else if selected}
			<p class="text-xs text-muted-foreground">{$t('roles.tenantWidePermission')}</p>
		{/if}
	</div>
</FormModal>
