<script lang="ts">
	import type { Snippet } from 'svelte';
	import type { HTMLAttributes } from 'svelte/elements';
	import { cn } from '$lib/utils';

	const {
		class: className,
		children,
		...restProps
	}: HTMLAttributes<HTMLDivElement> & { children?: Snippet } = $props();
</script>

<div class={cn('flex flex-col-reverse gap-2 [&>button]:shrink-0 sm:flex-row sm:flex-wrap sm:justify-end', className)} {...restProps}>
	{@render children?.()}
</div>
