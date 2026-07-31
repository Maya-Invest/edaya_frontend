<script lang="ts">
	import type { ComponentProps } from 'svelte';
	import StudentPicker from '$lib/smart-components/student-picker/StudentPicker.svelte';

	let {
		value = $bindable(''),
		...rest
	}: ComponentProps<typeof StudentPicker> = $props();
</script>

<StudentPicker bind:value {...rest} active />
