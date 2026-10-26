<script lang="ts">
	import type { Snippet } from 'svelte';
	import Button from '$lib/components/ui/button/button.svelte';
	import * as Popover from '$lib/components/ui/popover';
	import { t } from '$lib/i18n';
	import { MoreHorizontal } from '$lib/icons';
	import { setContext } from 'svelte';
	import { COLLECTION_MENU } from './context';

	const { children }: { children: Snippet } = $props();
	let open = $state(false);
	setContext(COLLECTION_MENU, {
		close: () => {
			open = false;
		},
	});
</script>

<Popover.Popover bind:open>
	<Popover.PopoverTrigger>
		{#snippet child({ props })}
			<Button {...props} variant="ghost" size="icon" aria-label={$t('list.moreActions')} data-testid="collection-menu">
				<MoreHorizontal />
			</Button>
		{/snippet}
	</Popover.PopoverTrigger>
	<Popover.PopoverContent align="end" class="max-h-[70dvh] w-72 max-w-[calc(100vw-2rem)] overflow-y-auto p-2">
		<div class="collection-actions" role="presentation" onclick={(event) => {
			const button = (event.target as Element).closest('button');
			if (button && !button.disabled && !button.hasAttribute('aria-expanded'))
				open = false;
		}}>
			{@render children()}
		</div>
	</Popover.PopoverContent>
</Popover.Popover>

<style>
	.collection-actions :global(button) {
		min-height: 44px;
		width: 100%;
		justify-content: flex-start;
		white-space: normal;
		text-align: left;
		border-color: transparent;
		background: transparent;
		color: inherit;
	}
	.collection-actions :global(button:hover:not(:disabled)),
	.collection-actions :global(button:focus-visible) { background: hsl(var(--secondary)); }
	.collection-actions :global(button.text-destructive) { color: hsl(var(--destructive)); }
</style>
