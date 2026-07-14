<script lang="ts">
	import type { StaffPermissionAssignmentView } from '$lib/api/staff-permission-assignments-data';
	import type { StaffMember } from '$lib/types/school';
	import { createStaffPermissionAssignmentPayload } from '$lib/api/mutations/staff-permission-assignments.mutations';
	import { formatPermissionLabel } from '$lib/api/staff-permission-assignments-data';
	import ScopeBuilder from '$lib/components/school/configuration/ScopeBuilder.svelte';
	import FormModal from '$lib/components/ui/FormModal.svelte';
	import Label from '$lib/components/ui/label/label.svelte';
	import { t } from '$lib/i18n';
	import { get } from 'svelte/store';
	import { getStaffPageState } from '../../../../staff-page.svelte';

	let {
		open = $bindable(false),
		staff,
		assignment = null,
	}: {
		open?: boolean;
		staff: StaffMember;
		assignment?: StaffPermissionAssignmentView | null;
	} = $props();

	let busy = $state(false);
	let permission = $state<StaffPermissionAssignmentView['permission'] | ''>('');
	let scopeIds = $state('');

	const staffPage = getStaffPageState();

	const catalog = $derived(staffPage.permissionCatalog);
	const selectedEntry = $derived(catalog.find(entry => entry.permission === permission));
	const requiresScope = $derived(Boolean(selectedEntry?.scope));

	$effect(() => {
		if (!open) {
			return;
		}
		permission = assignment?.permission ?? '';
		scopeIds = assignment?.scopeIds ?? '';
	});

	const canSubmit = $derived(Boolean(permission) && (!requiresScope || scopeIds.trim().length > 0));

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

		const ok = await staffPage.savePermission({
			assignment: payload,
			successMessage: get(t)('roles.permissionSaved', {
				permission: formatPermissionLabel(permission, get(t)),
			}),
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
				<ScopeBuilder grain={selectedEntry.scope} bind:scopeIds />
			</div>
		{:else if permission}
			<p class="text-xs text-muted-foreground">{$t('roles.tenantWidePermission')}</p>
		{/if}
	</div>
</FormModal>
