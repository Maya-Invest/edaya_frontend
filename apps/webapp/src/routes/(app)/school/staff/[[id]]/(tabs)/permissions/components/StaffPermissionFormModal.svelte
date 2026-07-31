<script lang="ts">
	import type { StaffPermissionAssignmentView } from '$lib/api/staff-permission-assignments-data';
	import type { StaffMember } from '$lib/types/school';
	import StaffPermissionFormModal from '$lib/smart-components/staff-permission-form-modal/StaffPermissionFormModal.svelte';
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

	const staffPage = getStaffPageState();
</script>

<StaffPermissionFormModal
	bind:open
	{staff}
	{assignment}
	onSave={input => staffPage.savePermission(input)}
/>
