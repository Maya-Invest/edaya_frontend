<script lang="ts">
	import type { components } from '$lib/api/schema';
	import type { StaffPermissionAssignmentView } from '$lib/api/staff-permission-assignments-data';
	import type { StaffMember } from '$lib/types/school';
	import {
		createStaffPermissionAssignmentPayload,
		saveStaffPermissionAssignmentMutation,
	} from '$lib/api/mutations/staff-permission-assignments.mutations';
	import { formatPermissionLabel } from '$lib/api/staff-permission-assignments-data';
	import FormModal from '$lib/components/ui/FormModal.svelte';
	import Label from '$lib/components/ui/label/label.svelte';
	import { t } from '$lib/i18n';
	import { LoaderCircle } from '$lib/icons';
	import ScopeBuilder from '$lib/smart-components/scope-builder/ScopeBuilder.svelte';
	import { get } from 'svelte/store';
	import { StaffPermissionFormModalState } from './staff-permission-form-modal-state.svelte';

	type StaffPermissionAssignment = components['schemas']['StaffPermissionAssignment'];

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
			assignment: StaffPermissionAssignment;
			successMessage: string;
		}) => Promise<boolean>;
	} = $props();

	const modalState = new StaffPermissionFormModalState();

	let busy = $state(false);
	let permission = $state<StaffPermissionAssignmentView['permission'] | ''>('');
	let scopeIds = $state('');

	const catalog = $derived(modalState.catalog);
	const selectedEntry = $derived(catalog.find(entry => entry.permission === permission));
	const requiresScope = $derived(Boolean(selectedEntry?.scope));

	$effect(() => {
		if (open) {
			void modalState.ensureLoaded();
		}
	});

	$effect(() => {
		if (!open) {
			return;
		}
		permission = assignment?.permission ?? '';
		scopeIds = assignment?.scopeIds ?? '';
	});

	const canSubmit = $derived(Boolean(permission) && (!requiresScope || scopeIds.trim().length > 0) && !modalState.loading);

	async function submit() {
		if (!canSubmit || !permission) {
			return;
		}

		busy = true;
		const id = assignment?.id ?? `spa-${Date.now().toString(36)}`;
		const payload = createStaffPermissionAssignmentPayload({
			id,
			staffId: staff.id,
			permission,
			scopeIds: requiresScope ? scopeIds.trim() : '',
		});
		const successMessage = get(t)('roles.permissionSaved', {
			permission: formatPermissionLabel(permission, get(t)),
		});

		const ok = onSave
			? await onSave({ assignment: payload, successMessage })
			: await saveStaffPermissionAssignmentMutation({
				assignment: payload,
				successMessage,
			});
		busy = false;

		if (ok) {
			open = false;
		}
	}
</script>

<FormModal
	bind:open
	title={assignment ? $t('roles.editPermission') : $t('roles.addPermission')}
	description={$t('roles.permissionFormHint')}
	submitLabel={$t('common.save')}
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
				<Label for="permission-select">{$t('roles.permissionField')}</Label>
				<select
					id="permission-select"
					bind:value={permission}
					class="h-10 w-full rounded-xl border border-border bg-background px-3 text-sm"
				>
					<option value="">{$t('roles.selectPermission')}</option>
					{#each catalog as entry (entry.permission)}
						<option value={entry.permission}>{formatPermissionLabel(entry.permission, $t)}</option>
					{/each}
				</select>
			</div>

			{#if requiresScope && selectedEntry?.scope && selectedEntry.scope !== 'platform'}
				<div class="space-y-2">
					<Label>{$t('roles.scopeIdsField')}</Label>
					<ScopeBuilder grain={selectedEntry.scope} bind:scopeIds active={open} />
				</div>
			{:else if permission}
				<p class="text-xs text-muted-foreground">{$t('roles.tenantWidePermission')}</p>
			{/if}
		{/if}
	</div>
</FormModal>
