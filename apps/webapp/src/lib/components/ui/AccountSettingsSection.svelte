<script lang="ts">
	import type { Snippet } from 'svelte';
	import { cn } from '$lib/utils';

	const { title, description, inset = false, children }: { title?: string; description?: string; inset?: boolean; children: Snippet } = $props();
</script>
<section class={cn('min-w-0 space-y-6', inset && 'p-4 md:p-6')}>
	{#if title}<header><h2 data-account-heading tabindex="-1" class="font-display text-xl font-semibold leading-tight">{title}</h2>{#if description}<p class="mt-2 text-sm text-muted-foreground">{description}</p>{/if}</header>{/if}
	{@render children()}
</section>
