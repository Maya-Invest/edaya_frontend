<script lang="ts">
	import type { Snippet } from 'svelte';
	import { cn } from '$lib/utils';

	const {
		children,
		onclick,
		disabled = false,
		destructive = false,
		title,
	}: {
		children: Snippet;
		onclick?: (event: MouseEvent) => void;
		disabled?: boolean;
		destructive?: boolean;
		title?: string;
	} = $props();
</script>

<button
	type="button"
	class={cn(
		'control-focus ui-menu-row flex min-h-11 w-full items-center gap-2 rounded-none px-2 py-1.5 text-left text-sm hover:bg-secondary disabled:cursor-not-allowed disabled:opacity-50',
		destructive && 'text-destructive hover:text-destructive',
	)}
	{disabled}
	{title}
	{onclick}
>
	{@render children()}
</button>
