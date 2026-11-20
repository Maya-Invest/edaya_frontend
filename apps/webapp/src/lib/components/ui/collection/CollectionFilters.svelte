<script lang="ts">
	import type { Snippet } from 'svelte';
	import Button from '$lib/components/ui/button/button.svelte';
	import * as Popover from '$lib/components/ui/popover';
	import { t } from '$lib/i18n';
	import { ListFilter } from '$lib/icons';
	import { setContext } from 'svelte';
	import { COLLECTION_FILTER } from './context';

	const { children, activeCount = 0, onReset, iconTreatment = 'circle' }: {
		children: Snippet;
		iconTreatment?: 'circle' | 'quiet';
		activeCount?: number;
		onReset?: () => void;
	} = $props();
	setContext(COLLECTION_FILTER, true);
</script>

<Popover.Popover>
	<Popover.PopoverTrigger>
		{#snippet child({ props })}
			<Button {...props} variant="ghost" size="icon" {iconTreatment} aria-label={activeCount ? `${$t('list.filter')} · ${activeCount}` : $t('list.filter')} data-testid="collection-filter">
				<ListFilter />
				{#if activeCount > 0}<span class="absolute right-0 top-0 rounded-full bg-primary px-1 text-xs tabular-nums text-primary-foreground">{activeCount}</span>{/if}
			</Button>
		{/snippet}
	</Popover.PopoverTrigger>
	<Popover.PopoverContent align="end" class="max-h-[70dvh] w-80 max-w-[calc(100vw-2rem)] space-y-4 overflow-y-auto p-4">
		<h3 class="text-sm font-semibold">{$t('list.filters')}</h3>
		<div class="ui-filter-controls flex flex-col gap-4">{@render children()}</div>
		{#if onReset}<Button variant="outline" onclick={onReset}>{$t('list.resetFilters')}</Button>{/if}
	</Popover.PopoverContent>
</Popover.Popover>
