<script lang="ts">
	import type { Snippet } from 'svelte';
	import Button from '$lib/components/ui/button/button.svelte';
	import * as Popover from '$lib/components/ui/popover';
	import { t } from '$lib/i18n';
	import { MoreHorizontal } from '$lib/icons';

	const {
		name,
		summary,
		avatar,
		chips,
		facts,
		actions,
		overflow,
	}: {
		name?: string;
		summary?: string;
		avatar?: Snippet;
		chips?: Snippet;
		facts?: Snippet;
		actions?: Snippet;
		overflow?: Snippet;
	} = $props();

	let overflowOpen = $state(false);
</script>

<header class="border-b border-border pb-5">
	<div class="flex flex-wrap items-start justify-between gap-4">
		<div class="flex min-w-0 flex-1 items-start gap-4">
			{#if avatar}
				<div class="shrink-0">
					{@render avatar()}
				</div>
			{/if}
			<div class="min-w-0 flex-1">
				{#if chips}
					<div class={['flex flex-wrap items-center gap-2', name || summary ? 'mb-2' : '']}>
						{@render chips()}
					</div>
				{/if}
				{#if name}
					<h3 class="font-display text-xl font-semibold leading-tight">{name}</h3>
				{/if}
				{#if facts}<div class="mt-3 space-y-2">{@render facts()}</div>{/if}
				{#if summary}
					<p class={['text-sm text-muted-foreground', name ? 'mt-1' : '']}>{summary}</p>
				{/if}
			</div>
		</div>
		{#if actions || overflow}
			<div class="flex max-w-full shrink-0 flex-wrap items-center justify-end gap-2">
				{@render actions?.()}
				{#if overflow}
					<Popover.Popover bind:open={overflowOpen}>
						<Popover.PopoverTrigger>
							{#snippet child({ props })}
								<Button
									{...props}
									variant="outline"
									size="icon"

									aria-label={$t('list.moreActions')}
								>
									<MoreHorizontal class="h-4 w-4" />
								</Button>
							{/snippet}
						</Popover.PopoverTrigger>
						<Popover.PopoverContent class="w-44 p-1" align="end">
							<div class="p-1" role="presentation" onclick={() => overflowOpen = false}>
								{@render overflow()}
							</div>
						</Popover.PopoverContent>
					</Popover.Popover>
				{/if}
			</div>
		{/if}
	</div>
</header>
