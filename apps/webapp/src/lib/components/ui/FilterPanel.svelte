<script lang="ts">
	import type { Snippet } from 'svelte';
	import Button from '$lib/components/ui/button/button.svelte';
	import * as Popover from '$lib/components/ui/popover';
	import { t } from '$lib/i18n';
	import { ListFilter } from '$lib/icons';
	import { cn } from '$lib/utils';
	import { getContext } from 'svelte';
	import { COLLECTION_FILTER } from './collection/context';

	const {
		children,
		activeCount = 0,
		title,
		class: className,
	}: {
		children: Snippet;
		activeCount?: number;
		title?: string;
		class?: string;
	} = $props();

	let open = $state(false);
	const embedded = getContext(COLLECTION_FILTER);
</script>

{#if embedded}
	<section class="ui-filter-controls space-y-2">{#if title}<h4 class="text-sm font-medium">{title}</h4>{/if}{@render children()}</section>
{:else}
	<Popover.Popover bind:open>
		<Popover.PopoverTrigger>
			{#snippet child({ props })}
				<Button
					{...props}
					variant="outline"
					size="sm"
					class={cn('h-9 gap-1.5 rounded-full px-3', className)}
					aria-label={title ?? $t('list.filter')}
					data-testid="list-filter"
				>
					<ListFilter class="h-4 w-4" />
					<span>{$t('list.filter')}</span>
					{#if activeCount > 0}
						<span
							class="flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-[10px] font-medium text-primary-foreground"
						>
							{activeCount}
						</span>
					{/if}
				</Button>
			{/snippet}
		</Popover.PopoverTrigger>
		<Popover.PopoverContent class="ui-filter-controls max-h-[calc(100dvh-2rem)] w-72 space-y-4 overflow-y-auto p-4" align="end">
			<p class="font-sans tabular-nums text-[10px] uppercase tracking-wider text-muted-foreground">
				{title ?? $t('list.filters')}
			</p>
			{@render children()}
		</Popover.PopoverContent>
	</Popover.Popover>

{/if}
