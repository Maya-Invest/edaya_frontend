<script lang="ts">
	import type { Snippet } from 'svelte';
	import CollectionFilters from './collection/CollectionFilters.svelte';
	import CollectionMenu from './collection/CollectionMenu.svelte';

	const {
		eyebrow,
		title,
		level = 'page',
		description,
		search,
		filters,
		context,
		primary,
		more,
		filterCount = 0,
		onResetFilters,
	}: {
		eyebrow?: string;
		title: string;
		level?: 'page' | 'section';
		description?: string;
		search?: Snippet;
		filters?: Snippet;
		context?: Snippet;
		primary?: Snippet;
		more?: Snippet;
		filterCount?: number;
		onResetFilters?: () => void;
	} = $props();
</script>

<header class="mb-6 flex flex-col gap-4 md:flex-row md:flex-wrap md:items-end md:justify-between">
	<div class="min-w-0">
		{#if eyebrow}
			<p class="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
				{eyebrow}
			</p>
		{/if}
		{#if level === 'section'}
			<h3 class="font-display text-xl font-semibold leading-tight">{title}</h3>
		{:else}
			<h2 class="font-display text-2xl md:text-[28px] font-semibold leading-tight">{title}</h2>
		{/if}
		{#if description}
			<p class="mt-1 text-sm text-muted-foreground">{description}</p>
		{/if}
	</div>
	<div class="flex min-w-0 items-center gap-2">
		{#if search}<div class="min-w-0 flex-1">{@render search()}</div>{/if}
		{#if filters}<CollectionFilters activeCount={filterCount} onReset={onResetFilters}>{@render filters()}</CollectionFilters>{/if}
		{#if primary || more}<CollectionMenu>{@render primary?.()}{@render more?.()}</CollectionMenu>{/if}
	</div>
	{#if context}<div class="w-full min-w-0">{@render context()}</div>{/if}
</header>
