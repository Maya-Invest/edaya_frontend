<script lang="ts">
	import type { GrantScope } from '$lib/api/grant-scopes';
	import { academicContext } from '$lib/academic/context.svelte';
	import { permissionSelectionGrains, scopeSelectionsComplete } from '$lib/api/grant-scopes';
	import { authSession } from '$lib/auth/session.svelte';
	import PermissionResolutionPreview from '$lib/components/school/PermissionResolutionPreview.svelte';
	import Checkbox from '$lib/components/ui/checkbox/checkbox.svelte';
	import FormModal from '$lib/components/ui/FormModal.svelte';
	import Label from '$lib/components/ui/label/label.svelte';
	import { t } from '$lib/i18n';
	import { PermissionImpactPreviewState } from '$lib/school/permission-impact-preview-state.svelte';
	import PermissionScopeSelections from '$lib/smart-components/scope-builder/PermissionScopeSelections.svelte';
	import { untrack } from 'svelte';
	import { get } from 'svelte/store';
	import { getStaffPageState } from '../../../../staff-page.svelte';

	let { open = $bindable(false), staffId, initialProfileId = '' }: { open?: boolean; staffId: string; initialProfileId?: string } = $props();
	const staffPage = getStaffPageState();
	let saving = $state(false);
	const preview = new PermissionImpactPreviewState();
	const busy = $derived(saving || preview.loading);
	let profileId = $state('');
	let customScopes = $state<GrantScope[]>([]);
	let useDefaultScopes = $state(true);

	const input = $derived({ staffId, profileId, academicYearId: academicContext.yearId, customScopes, useDefaultScopes });
	const snapshot = $derived({ schoolId: authSession.schoolId ?? academicContext.schools[0]?.id ?? '', ...input });
	const reviewed = $derived(preview.reviewed(snapshot));
	$effect(() => preview.synchronize(open, snapshot));
	const selected = $derived(staffPage.staffPermissionProfiles.find(row => row.id === profileId));
	const grains = $derived([...new Set([
		...staffPage.permissionCatalog.filter(entry => selected?.permissions.includes(entry.permission)).flatMap(permissionSelectionGrains),
		...customScopes.map(scope => scope.kind === 'all' ? scope.grain : scope.kind),
	])]);
	const canSubmit = $derived(Boolean(selected) && scopeSelectionsComplete(customScopes));
	function selectProfile(id: string) {
		profileId = id;
		const binding = staffPage.permissionProfileBindingsForStaff(staffId).find(row => row.profileId === id);
		customScopes = [...(binding?.customScopes ?? [])];
		useDefaultScopes = binding?.useDefaultScopes ?? true;
		preview.reset();
	}
	$effect(() => {
		const target = [open, staffId, initialProfileId, academicContext.yearId, authSession.schoolId ?? academicContext.schools[0]?.id ?? ''];
		untrack(() => {
			preview.reset();
			if (target[0])
				selectProfile(initialProfileId);
		});
		return () => preview.reset();
	});

	async function submit() {
		if (!canSubmit || busy || !selected)
			return;
		if (!reviewed) {
			await preview.review(snapshot, command => staffPage.previewProfileAssignment(command), () => snapshot, () => open);
			return;
		}
		saving = true;
		try {
			if (await staffPage.applyPermissionProfile({ ...input, successMessage: get(t)('staff.profileApplied', { name: selected.name }) }))
				open = false;
		}
		finally { saving = false; }
	}
</script>
<FormModal bind:open title={$t('staff.applyProfileTitle')} description={$t('staff.applyProfileHint')}
	submitLabel={reviewed ? $t('common.save') : $t('staff.reviewScopeChanges')} {busy} submitDisabled={!canSubmit} onSubmit={submit}>
	<div class="space-y-4">
		<div class="space-y-2"><Label for="apply-profile-select">{$t('staff.selectProfile')}</Label>
			<select id="apply-profile-select" value={profileId} onchange={event => selectProfile(event.currentTarget.value)} class="h-10 w-full rounded-xl border border-border bg-background px-3 text-sm">
				<option value="">{$t('staff.selectProfile')}</option>
				{#each staffPage.staffPermissionProfiles as profile (profile.id)}<option value={profile.id}>{profile.name}</option>{/each}
			</select>
		</div>
		{#if selected}
			<label class="flex items-center gap-2 text-sm"><Checkbox bind:checked={useDefaultScopes} />{$t('staff.includeDefaultScopes')}</label>
			<p class="text-xs text-muted-foreground">{$t('staff.defaultScopeAdditiveHint')}</p>
			{#if useDefaultScopes && !staffPage.staffDefaultScopes(staffId).length}<p class="text-xs text-highlight">{$t('staff.noDefaultScopes')}</p>{/if}
			<Label>{$t('staff.customScopes')}</Label>
			<PermissionScopeSelections bind:scopes={customScopes} {grains} active={open} />
		{/if}
		{#if reviewed && preview.report}<PermissionResolutionPreview report={preview.report} />{/if}
	</div>
</FormModal>
