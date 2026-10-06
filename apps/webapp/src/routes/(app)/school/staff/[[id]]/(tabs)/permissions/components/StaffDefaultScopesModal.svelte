<script lang="ts">
	import type { GrantScope } from '$lib/api/grant-scopes';
	import { academicContext } from '$lib/academic/context.svelte';
	import { scopeSelectionsComplete } from '$lib/api/grant-scopes';
	import { authSession } from '$lib/auth/session.svelte';
	import PermissionResolutionPreview from '$lib/components/school/PermissionResolutionPreview.svelte';
	import FormModal from '$lib/components/ui/FormModal.svelte';
	import { t } from '$lib/i18n';
	import { PermissionImpactPreviewState } from '$lib/school/permission-impact-preview-state.svelte';
	import PermissionScopeSelections from '$lib/smart-components/scope-builder/PermissionScopeSelections.svelte';
	import { untrack } from 'svelte';
	import { get } from 'svelte/store';
	import { getStaffPageState } from '../../../../staff-page.svelte';

	let { open = $bindable(false), staffId }: { open?: boolean; staffId: string } = $props();
	const staffPage = getStaffPageState();
	let scopes = $state<GrantScope[]>([]);
	let saving = $state(false);
	const preview = new PermissionImpactPreviewState();
	const busy = $derived(saving || preview.loading);

	const input = $derived({ staffId, academicYearId: staffPage.staffScope().academicYearId, scopes });
	const snapshot = $derived({ schoolId: authSession.schoolId ?? academicContext.schools[0]?.id ?? '', ...input });
	const reviewed = $derived(preview.reviewed(snapshot));
	$effect(() => preview.synchronize(open, snapshot));
	$effect(() => {
		const target = [open, staffId, academicContext.yearId, authSession.schoolId ?? academicContext.schools[0]?.id ?? ''];
		untrack(() => {
			preview.reset();
			if (target[0])
				scopes = [...staffPage.staffDefaultScopes(staffId)];
		});
		return () => preview.reset();
	});

	async function submit() {
		if (busy || !scopeSelectionsComplete(scopes))
			return;
		if (!reviewed) {
			await preview.review(snapshot, command => staffPage.previewDefaultScopes(command), () => snapshot, () => open);
			return;
		}
		saving = true;
		try {
			if (await staffPage.saveDefaultScopes(input, get(t)('staff.defaultScopesSaved')))
				open = false;
		}
		finally { saving = false; }
	}
</script>
<FormModal bind:open title={$t('staff.defaultScopes')} description={$t('staff.defaultScopesYearHint')}
	submitLabel={reviewed ? $t('common.save') : $t('staff.reviewScopeChanges')} {busy} submitDisabled={!scopeSelectionsComplete(scopes)} onSubmit={submit}>
	<PermissionScopeSelections bind:scopes active={open} />
	{#if reviewed && preview.report}<PermissionResolutionPreview report={preview.report} />{/if}
</FormModal>
