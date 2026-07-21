<script lang="ts">
	import type { ComponentProps } from 'svelte';
	import StaffPicker from '$lib/smart-components/staff-picker/StaffPicker.svelte';

	let {
		value = $bindable(''),
		...rest
	}: ComponentProps<typeof StaffPicker> = $props();
</script>

<StaffPicker bind:value {...rest} active />
