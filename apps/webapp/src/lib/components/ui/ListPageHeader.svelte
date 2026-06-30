<script lang="ts">
	import type { Snippet } from 'svelte';

	const {
		eyebrow,
		title,
		description,
		search,
		filters,
		primary,
		more,
	}: {
		eyebrow?: string;
		title: string;
		description?: string;
		search?: Snippet;
		filters?: Snippet;
		primary?: Snippet;
		more?: Snippet;
	} = $props();
</script>

<header class="mb-5 flex flex-wrap items-end justify-between gap-3">
	<div>
		{#if eyebrow}
			<p class="font-mono text-xs uppercase tracking-widest text-muted-foreground">
				{eyebrow}
			</p>
		{/if}
		<h2 class="font-display text-2xl font-semibold">{title}</h2>
		{#if description}
			<p class="mt-1 text-sm text-muted-foreground">{description}</p>
		{/if}
	</div>
	<div class="flex flex-wrap items-center gap-2">
		{@render search?.()}
		{@render filters?.()}
		{@render more?.()}
		{@render primary?.()}
	</div>
</header>
