<script lang="ts">
	import type { UserScopeSelection } from '$lib/api/grant-scopes';
	import type { StaffPermissionAssignmentView } from '$lib/api/staff-permission-assignments-data';
	import type { StaffMember } from '$lib/types/school';
	import { academicContext } from '$lib/academic/context.svelte';
	import { permissionSelectionGrains, scopeSelectionsComplete } from '$lib/api/grant-scopes';
	import { formatPermissionLabel } from '$lib/api/staff-permission-assignments-data';
	import { authSession } from '$lib/auth/session.svelte';
	import PermissionResolutionPreview from '$lib/components/school/PermissionResolutionPreview.svelte';
	import Checkbox from '$lib/components/ui/checkbox/checkbox.svelte';
	import FormModal from '$lib/components/ui/FormModal.svelte';
	import Label from '$lib/components/ui/label/label.svelte';
	import { t } from '$lib/i18n';
	import { LoaderCircle } from '$lib/icons';
	import { PermissionImpactPreviewState } from '$lib/school/permission-impact-preview-state.svelte';
	import PermissionScopeSelections from '$lib/smart-components/scope-builder/PermissionScopeSelections.svelte';
	import PermissionScopeTypes from '$lib/smart-components/scope-builder/PermissionScopeTypes.svelte';
	import { untrack } from 'svelte';
	import { get } from 'svelte/store';
	import { StaffPermissionFormModalState } from './staff-permission-form-modal-state.svelte';

	let {
		open = $bindable(false),
		staff,
		assignment = null,
		onSave,
	}: {
		open?: boolean;
		staff: StaffMember;
		assignment?: StaffPermissionAssignmentView | null;
		onSave?: (input: {
			assignment: StaffPermissionAssignmentView;
			successMessage: string;
		}) => Promise<boolean>;
	} = $props();

	const modalState = new StaffPermissionFormModalState();

	let saving = $state(false);
	const preview = new PermissionImpactPreviewState();
	const busy = $derived(saving || preview.loading);
	let permission = $state<StaffPermissionAssignmentView['permission'] | ''>('');
	let scopes = $state<UserScopeSelection[]>([]);
	let useDefaultScopes = $state(true);

	const catalog = $derived(modalState.catalog);
	const selectedEntry = $derived(catalog.find(entry => entry.permission === permission));

	let assignmentId = $state('');
	const payload = $derived(permission
		? { ...(assignment ?? {}), ...modalState.createStaffPermissionAssignmentPayload({
			id: assignmentId,
			staffId: staff.id,
			permission,
			scopes,
			customScopes: selectedEntry?.scopePolicy.mode === 'none' ? [] : scopes,
			useDefaultScopes: selectedEntry?.scopePolicy.mode === 'resources' && useDefaultScopes,
		}), startsAt: assignment?.startsAt, endsAt: assignment?.endsAt, status: assignment?.status ?? 'active' }
		: null);
	const snapshot = $derived(payload
		? {
			id: payload.id,
			schoolId: payload.schoolId,
			staffId: payload.staffId,
			academicYearId: payload.academicYearId,
			permission: payload.permission,
			customScopes: selectedEntry?.scopePolicy.mode === 'none' ? [] : scopes,
			useDefaultScopes: selectedEntry?.scopePolicy.mode === 'resources' && useDefaultScopes,
			status: payload.status,
			startsAt: payload.startsAt,
			endsAt: payload.endsAt,
		}
		: null);
	const reviewed = $derived(preview.reviewed(snapshot));
	$effect(() => preview.synchronize(open, snapshot));

	$effect(() => {
		if (open) {
			void modalState.ensureLoaded();
		}
	});

	$effect(() => {
		const target = [open, staff.id, assignment, academicContext.yearId, authSession.schoolId];
		untrack(() => {
			preview.reset();
			if (!target[0])
				return;
			assignmentId = assignment?.id ?? crypto.randomUUID();
			permission = assignment?.permission ?? '';
			scopes = [...(assignment?.customScopes ?? assignment?.scopes ?? [])].filter(scope => scope.kind !== 'school');
			useDefaultScopes = assignment?.useDefaultScopes ?? true;
		});
		return () => preview.reset();
	});

	const canSubmit = $derived(Boolean(permission) && selectedEntry?.staffAssignable === true && scopeSelectionsComplete(scopes) && !modalState.loading);

	async function submit() {
		if (!canSubmit || !permission || busy || !payload || !snapshot) {
			return;
		}

		if (!reviewed) {
			await preview.review(snapshot, command => modalState.previewAssignment(command), () => snapshot!, () => open);
			return;
		}
		saving = true;
		try {
			const successMessage = get(t)('roles.permissionSaved', {
				permission: formatPermissionLabel(permission, get(t)),
			});

			const ok = onSave
				? await onSave({ assignment: payload, successMessage })
				: await modalState.saveStaffPermissionAssignmentMutation({
					assignment: payload,
					successMessage,
				});

			if (ok) {
				open = false;
			}
		}
		finally { saving = false; }
	}
</script>

<FormModal
	bind:open
	title={assignment ? $t('roles.editPermission') : $t('roles.addPermission')}
	description={$t('roles.permissionFormHint')}
	submitLabel={reviewed ? $t('common.save') : $t('staff.reviewScopeChanges')}
	{busy}
	submitDisabled={!canSubmit}
	onSubmit={submit}
>
	<div class="space-y-4">
		{#if modalState.loading && catalog.length === 0}
			<div class="flex items-center justify-center py-8" role="status">
				<LoaderCircle class="h-5 w-5 animate-spin text-primary" />
			</div>
		{:else}
			<div class="space-y-2">
				<div class="flex flex-wrap items-center gap-2">
					<Label for="permission-select">{$t('roles.permissionField')}</Label>
					<PermissionScopeTypes entry={selectedEntry} />
				</div>
				<select
					id="permission-select"
					bind:value={permission}
					onchange={() => scopes = []}
					class="h-10 w-full rounded-xl border border-border bg-background px-3 text-sm"
				>
					<option value="">{$t('roles.selectPermission')}</option>
					{#each catalog.filter(entry => entry.staffAssignable) as entry (entry.permission)}
						<option value={entry.permission}>{formatPermissionLabel(entry.permission, $t)}{permissionSelectionGrains(entry).length ? ` — ${permissionSelectionGrains(entry).map(grain => $t(`scope.grain.${grain}`)).join(' / ')}` : ''}</option>
					{/each}
				</select>
			</div>

			{#if selectedEntry?.scopePolicy.mode === 'resources'}
				<label class="flex items-center gap-2 text-sm"><Checkbox bind:checked={useDefaultScopes} />{$t('staff.includeDefaultScopes')}</label>
				<p class="text-xs text-muted-foreground">{$t('staff.defaultScopeAdditiveHint')}</p>
				<Label>{$t('staff.customScopes')}</Label>
				<PermissionScopeSelections bind:scopes grains={selectedEntry ? permissionSelectionGrains(selectedEntry) : []} active={open} />
			{/if}
			{#if reviewed && preview.report}<PermissionResolutionPreview report={preview.report} />{/if}
		{/if}
	</div>
</FormModal>
