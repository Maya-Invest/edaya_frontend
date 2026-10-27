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
	bind:value={() => value, (next) => {
		value = next == null ? '' : String(next);
	}}
	class={cn(
		'control-focus ui-field flex min-h-11 w-full rounded-full border border-input bg-card px-4 py-2 text-sm file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground aria-[invalid=true]:border-destructive disabled:cursor-not-allowed disabled:bg-border disabled:border-border disabled:text-muted-foreground',
		className,
	)}
	{...restProps}
/>
