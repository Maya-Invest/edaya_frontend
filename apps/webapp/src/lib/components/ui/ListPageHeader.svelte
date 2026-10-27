<script lang="ts">
	import type { Snippet } from 'svelte';
	import { collectionPresentation } from '$lib/list/collection-presentation.svelte';
	import Button from './button/button.svelte';

	const presentation = collectionPresentation();
	import CollectionFilters from './collection/CollectionFilters.svelte';
	import CollectionMenu from './collection/CollectionMenu.svelte';

	const {
		eyebrow,
		hiddenSort,
		title,
		level = 'page',
		surface = 'page',
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
		hiddenSort?: string;
		title: string;
		level?: 'page' | 'section';
		surface?: 'page' | 'related';
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

<header class="ui-collection-header mb-6"><div class="ui-collection-header-layout">
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
		{#if hiddenSort || presentation?.hiddenSort}<p class="text-xs text-muted-foreground" role="status">{hiddenSort || presentation?.hiddenSort}</p>{/if}
	</div>
	<div class="ui-collection-toolbar">
		{#if search}<div class="ui-collection-search">{@render search()}</div>{/if}
		{#if filters}<CollectionFilters iconTreatment={surface === 'page' ? 'circle' : 'quiet'} activeCount={filterCount} onReset={onResetFilters}>{@render filters()}</CollectionFilters>{/if}
		{#if primary || more || presentation?.sorts.length}<CollectionMenu iconTreatment={surface === 'page' ? 'circle' : 'quiet'}>{@render primary?.()}{@render more?.()}{#each presentation?.sorts ?? [] as entry (entry.key)}<Button variant="ghost" aria-pressed={entry.active} onclick={entry.run}>{entry.label}</Button>{/each}</CollectionMenu>{/if}
	</div>
</div>
	{#if context}<div class="w-full min-w-0">{@render context()}</div>{/if}
</header>
