<script lang="ts">
	import { getStaffPageState } from '../../../staff-page.svelte';
	import StaffProfileTab from './components/StaffProfileTab.svelte';

	const staff = $derived(getStaffPageState().selected);
</script>

{#if staff}
	<StaffProfileTab s={staff} />
{/if}
