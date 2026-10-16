<script lang="ts">
	import type { Snippet } from 'svelte';

	const {
		eyebrow,
		title,
		level = 'page',
		description,
		search,
		filters,
		primary,
		more,
	}: {
		eyebrow?: string;
		title: string;
		level?: 'page' | 'section';
		description?: string;
		search?: Snippet;
		filters?: Snippet;
		primary?: Snippet;
		more?: Snippet;
	} = $props();
</script>

<header class="mb-6 flex flex-wrap items-end justify-between gap-4">
	<div class="min-w-0">
		{#if eyebrow}
			<p class="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
				{eyebrow}
			</p>
		{/if}
		{#if level === 'section'}
			<h3 class="font-display text-base font-semibold leading-tight">{title}</h3>
		{:else}
			<h2 class="font-display text-[28px] font-semibold leading-tight">{title}</h2>
		{/if}
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
