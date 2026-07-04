<script lang="ts">
	import type { Snippet } from 'svelte';
	import Button from '$lib/components/ui/button/button.svelte';
	import * as Popover from '$lib/components/ui/popover';
	import { t } from '$lib/i18n';
	import { ListFilter } from '$lib/icons';
	import { cn } from '$lib/utils';

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
</script>

<Popover.Popover bind:open>
	<Popover.PopoverTrigger>
		{#snippet child({ props })}
			<Button
				{...props}
				variant="outline"
				size="sm"
				class={cn('h-9 gap-1.5 rounded-full px-3', className)}
				aria-label={title ?? $t('list.filter')}
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
	<Popover.PopoverContent class="w-72 space-y-4 p-4" align="end">
		<p class="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
			{title ?? $t('list.filters')}
		</p>
		{@render children()}
	</Popover.PopoverContent>
</Popover.Popover>
