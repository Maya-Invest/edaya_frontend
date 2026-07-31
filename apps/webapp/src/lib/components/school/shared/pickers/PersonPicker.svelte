<script lang="ts">
	import type { ComponentProps } from 'svelte';
	import SmartPersonPicker from '$lib/smart-components/person-picker/PersonPicker.svelte';

	const props: ComponentProps<typeof SmartPersonPicker> = $props();
</script>

<SmartPersonPicker {...props} />
