<script lang="ts">
	import type { HTMLInputAttributes } from 'svelte/elements';
	import { cn } from '$lib/utils';

	let {
		class: className,
		value = $bindable(''),
		type = 'text',
		...restProps
	}: HTMLInputAttributes & { value?: string } = $props();
</script>

<input
	{type}
	bind:value
	class={cn(
		'control-focus flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50',
		className,
	)}
	{...restProps}
/>
