<script lang="ts">
	import type { components } from '$lib/api/schema';
	import {
		createStaffAssignmentPayload,
		saveStaffAssignmentMutation,
	} from '$lib/api/mutations/staff-assignments.mutations';
	import { getBrowserSchoolClient } from '$lib/api/school-client';
	import { catalogEntriesForClassGroupStaffAssignment } from '$lib/api/staff-assignment-permissions';
	import { loadPermissionCatalog } from '$lib/api/staff-permission-assignments-data';
	import FormModal from '$lib/components/ui/FormModal.svelte';
	import Input from '$lib/components/ui/input/input.svelte';
	import Label from '$lib/components/ui/label/label.svelte';
	import { detailDataContext } from '$lib/detail-data/context.svelte';
	import { t } from '$lib/i18n';
	import { get } from 'svelte/store';
	import StaffPicker from '../shared/pickers/StaffPicker.svelte';
	import PermissionCheckboxGroup from './PermissionCheckboxGroup.svelte';

	type StaffAssignment = components['schemas']['StaffAssignment'];

	let {
		open = $bindable(false),
		classGroupId,
		assignment = null,
	}: {
		open?: boolean;
		classGroupId: string;
		assignment?: StaffAssignment | null;
	} = $props();

	let busy = $state(false);
	let staffId = $state('');
	let responsibility = $state('');
	let permissions = $state<StaffAssignment['permissions']>([]);
	let catalogLoaded = $state(false);

	const staff = $derived(detailDataContext.staff);
	const catalog = $derived(detailDataContext.permissionCatalog);
	const permissionEntries = $derived(catalogEntriesForClassGroupStaffAssignment(catalog));

	$effect(() => {
		const allowed = new Set(permissionEntries.map(entry => entry.permission));
		const pruned = permissions.filter(permission => allowed.has(permission));
		if (pruned.length !== permissions.length) {
			permissions = pruned;
		}
	});

	$effect(() => {
		if (!open) {
			return;
		}
		if (assignment) {
			staffId = assignment.staffId;
			responsibility = assignment.responsibility;
			permissions = [...(assignment.permissions ?? [])];
		}
		else {
			staffId = staff[0]?.id ?? '';
			responsibility = '';
			permissions = [];
		}
	});

	$effect(() => {
		if (!open || catalogLoaded || catalog.length > 0) {
			return;
		}
		void (async () => {
			const entries = await loadPermissionCatalog(getBrowserSchoolClient());
			detailDataContext.seedStaffPermissionData({
				assignments: detailDataContext.staffPermissionAssignments,
				catalog: entries,
			});
			catalogLoaded = true;
		})();
	});

	const canSubmit = $derived(
		responsibility.trim().length > 0 && staffId.length > 0 && classGroupId.length > 0,
	);

	async function submit() {
		if (!canSubmit || busy) {
			return;
		}

		busy = true;
		const id = assignment?.id ?? `sa-${Date.now().toString(36)}`;
		const payload = createStaffAssignmentPayload({
			id,
			staffId,
			responsibility: responsibility.trim(),
			permissions,
			classGroupId,
		});

		const ok = await saveStaffAssignmentMutation({
			assignment: payload,
			successMessage: get(t)('classGroups.assignmentSaved'),
		});
		busy = false;

		if (ok) {
			open = false;
		}
	}
</script>

<FormModal
	bind:open
	title={assignment ? $t('classGroups.editAssignment') : $t('classGroups.addAssignment')}
	description={$t('classGroups.assignmentFormHint')}
	submitLabel={$t('common.save')}
	{busy}
	submitDisabled={!canSubmit}
	onSubmit={submit}
>
	<div class="space-y-4">
		<div class="space-y-2">
			<Label>{$t('classGroups.assignmentStaff')}</Label>
			<StaffPicker bind:value={staffId} {staff} placeholder={$t('classGroups.selectStaff')} />
		</div>

		<div class="space-y-2">
			<Label for="class-assignment-responsibility">{$t('classGroups.assignmentResponsibility')}</Label>
			<Input
				id="class-assignment-responsibility"
				bind:value={responsibility}
				placeholder={$t('classGroups.assignmentResponsibilityPlaceholder')}
			/>
		</div>

		<div class="space-y-2">
			<Label>{$t('staff.assignmentPermissions')}</Label>
			<p class="text-xs text-muted-foreground">{$t('staff.assignmentPermissionsHint')}</p>
			<PermissionCheckboxGroup entries={permissionEntries} bind:selected={permissions} />
		</div>
	</div>
</FormModal>
