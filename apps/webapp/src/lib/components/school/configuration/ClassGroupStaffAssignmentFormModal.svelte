<script lang="ts">
	import type { components } from '$lib/api/schema';
	import { catalogEntriesForClassGroupStaffAssignment } from '$lib/api/staff-assignment-permissions';
	import FormModal from '$lib/components/ui/FormModal.svelte';
	import Input from '$lib/components/ui/input/input.svelte';
	import Label from '$lib/components/ui/label/label.svelte';
	import { detailDataContext } from '$lib/detail-data/context.svelte';
	import { t } from '$lib/i18n';
	import { ClassGroupStaffAssignmentFormState } from '$lib/school/staff-assignment-form-state.svelte';
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

	const form = new ClassGroupStaffAssignmentFormState(() => detailDataContext.staff[0]?.id ?? '');

	const staff = $derived(detailDataContext.staff);
	const catalog = $derived(detailDataContext.permissionCatalog);
	const permissionEntries = $derived(catalogEntriesForClassGroupStaffAssignment(catalog));

	$effect(() => {
		form.prunePermissions(permissionEntries.map(entry => entry.permission));
	});

	$effect(() => {
		form.hydrateForOpen(open, assignment);
	});

	$effect(() => {
		void form.loadCatalogIfNeeded(open, catalog.length);
	});
</script>

<FormModal
	bind:open
	title={assignment ? $t('classGroups.editAssignment') : $t('classGroups.addAssignment')}
	description={$t('classGroups.assignmentFormHint')}
	submitLabel={$t('common.save')}
	busy={form.busy}
	submitDisabled={!form.canSubmit}
	onSubmit={() => form.submit(assignment, classGroupId, () => {
		open = false;
	})}
>
	<div class="space-y-4">
		<div class="space-y-2">
			<Label>{$t('classGroups.assignmentStaff')}</Label>
			<StaffPicker bind:value={form.staffId} {staff} placeholder={$t('classGroups.selectStaff')} />
		</div>

		<div class="space-y-2">
			<Label for="class-assignment-responsibility">{$t('classGroups.assignmentResponsibility')}</Label>
			<Input
				id="class-assignment-responsibility"
				bind:value={form.responsibility}
				placeholder={$t('classGroups.assignmentResponsibilityPlaceholder')}
			/>
		</div>

		<div class="space-y-2">
			<Label>{$t('staff.assignmentPermissions')}</Label>
			<p class="text-xs text-muted-foreground">{$t('staff.assignmentPermissionsHint')}</p>
			<PermissionCheckboxGroup entries={permissionEntries} bind:selected={form.permissions} />
		</div>
	</div>
</FormModal>
