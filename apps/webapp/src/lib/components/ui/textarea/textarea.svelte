<script lang="ts">
	import type { HTMLTextareaAttributes } from 'svelte/elements';
	import { cn } from '$lib/utils';

	let {
		class: className,
		value = $bindable(''),
		...restProps
	}: HTMLTextareaAttributes & { value?: string } = $props();
</script>

<textarea
	bind:value
	class={cn(
		'control-focus flex min-h-[80px] w-full rounded-md border border-input bg-card px-3 py-2 text-sm placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50',
		className,
	)}
	{...restProps}
></textarea>
