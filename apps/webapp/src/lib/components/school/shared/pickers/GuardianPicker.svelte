<script lang="ts">
	import type { ComponentProps } from 'svelte';
	import GuardianPicker from '$lib/smart-components/guardian-picker/GuardianPicker.svelte';

	let {
		value = $bindable(''),
		...rest
	}: ComponentProps<typeof GuardianPicker> = $props();
</script>

<GuardianPicker bind:value {...rest} active />
