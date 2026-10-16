<script lang="ts">
	import type { StaffPermissionCode, StaffPermissionProfile } from '$lib/api/staff-permission-profiles-data';
	import { academicContext } from '$lib/academic/context.svelte';
	import { formatPermissionLabel } from '$lib/api/staff-permission-assignments-data';
	import {
		groupCatalogEntries,

	} from '$lib/api/staff-permission-profiles-data';
	import { authSession } from '$lib/auth/session.svelte';
	import PermissionResolutionPreview from '$lib/components/school/PermissionResolutionPreview.svelte';
	import Checkbox from '$lib/components/ui/checkbox/checkbox.svelte';
	import FormModal from '$lib/components/ui/FormModal.svelte';
	import Input from '$lib/components/ui/input/input.svelte';
	import { t } from '$lib/i18n';
	import { PermissionImpactPreviewState } from '$lib/school/permission-impact-preview-state.svelte';
	import PermissionScopeTypes from '$lib/smart-components/scope-builder/PermissionScopeTypes.svelte';
	import { untrack } from 'svelte';
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

	let saving = $state(false);
	const preview = new PermissionImpactPreviewState();
	const busy = $derived(saving || preview.loading);
	let name = $state('');
	let description = $state('');
	let permissions = $state<StaffPermissionCode[]>([]);

	const isEdit = $derived(profile !== null && profile !== undefined);
	const boundCount = $derived(profile ? permissionProfilesPage.boundCount(profile.id) : 0);

	const input = $derived({ id: profile?.id ?? '', name: name.trim(), description: description.trim() || undefined, permissions });
	const snapshot = $derived({ schoolId: authSession.schoolId ?? academicContext.schools[0]?.id ?? '', ...input });
	const reviewed = $derived(preview.reviewed(snapshot));
	$effect(() => preview.synchronize(open, snapshot));
	const groupedEntries = $derived(groupCatalogEntries(permissionProfilesPage.catalog.filter(entry => entry.scope !== 'platform')));
	const canSubmit = $derived(name.trim().length > 0);
	const saveDescription = $derived(boundCount > 0
		? $t('permissionProfiles.saveUpdatesStaff', { n: boundCount })
		: $t('permissionProfiles.subtitle'));

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
		preview.reset();
		if (profile) {
			name = profile.name;
			description = profile.description ?? '';
			permissions = [...profile.permissions];
			return;
		}
		name = '';
		description = '';
		permissions = [];
	}

	$effect(() => {
		const target = [open, profile, authSession.schoolId ?? academicContext.schools[0]?.id ?? ''];
		untrack(() => {
			preview.reset();
			if (target[0])
				resetForm();
		});
		return () => preview.reset();
	});

	async function submit() {
		if (!canSubmit || busy) {
			return;
		}

		if (!reviewed && profile) {
			await preview.review(snapshot, command => permissionProfilesPage.previewProfile(command), () => snapshot, () => open);
			return;
		}
		saving = true;
		try {
			const trimmedName = input.name;
			const payload = { name: input.name, description: input.description, permissions: input.permissions };

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
			saving = false;
		}
	}
</script>

<FormModal
	bind:open
	title={isEdit ? $t('permissionProfiles.editTitle') : $t('permissionProfiles.add')}
	description={saveDescription}
	submitLabel={isEdit && !reviewed ? $t('staff.reviewScopeChanges') : $t('academic.save')}
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
							<span class="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
								<span>{formatPermissionLabel(entry.permission, $t)}</span>
								<PermissionScopeTypes {entry} />
							</span>
						</label>
					{/each}
				</div>
			</div>
		{/each}
	</div>
	{#if reviewed && preview.report}<PermissionResolutionPreview report={preview.report} />{/if}
</FormModal>
