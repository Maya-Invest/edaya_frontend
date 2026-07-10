<script lang="ts">
	import { getStaffPageState } from '../../../staff-page.svelte';
	import StaffAssignmentsTab from './components/StaffAssignmentsTab.svelte';

	const staff = $derived(getStaffPageState().selected);
</script>

{#if staff}
	<StaffAssignmentsTab s={staff} />
{/if}
