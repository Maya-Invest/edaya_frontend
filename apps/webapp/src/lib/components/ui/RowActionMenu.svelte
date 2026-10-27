<script lang="ts">
	import type { Snippet } from 'svelte';
	import Button from '$lib/components/ui/button/button.svelte';
	import * as Popover from '$lib/components/ui/popover';
	import { t } from '$lib/i18n';
	import { MoreHorizontal } from '$lib/icons';
	import { actionMenu } from '$lib/interaction/action-menu';
	import { cn } from '$lib/utils';
	import { getContext } from 'svelte';
	import { COLLECTION_MENU } from './collection/context';

	const {
		children,
		class: className,
		label,
	}: {
		children: Snippet;
		class?: string;
		label?: string;
	} = $props();

	let open = $state(false);
	const embedded = getContext(COLLECTION_MENU);
</script>

{#if embedded}
	{@render children()}
{:else}
	<Popover.Popover bind:open>
		<Popover.PopoverTrigger>
			{#snippet child({ props })}
				<Button
					{...props}
					variant="ghost"
					size="icon"
					iconTreatment="quiet"
					class={cn('h-8 w-8 rounded-full p-0', className)}
					aria-label={label ?? $t('list.rowActions')}
				>
					<MoreHorizontal class="h-4 w-4" />
				</Button>
			{/snippet}
		</Popover.PopoverTrigger>
		<Popover.PopoverContent class="w-44 p-1" align="end">
			<!-- svelte-ignore a11y_click_events_have_key_events -->
			<div class="p-1" role="menu" tabindex="-1" use:actionMenu onclick={(event) => {
				const action = (event.target as Element).closest('button');
				if (action && !action.disabled)
					open = false;
			}}>
				{@render children()}
			</div>
		</Popover.PopoverContent>
	</Popover.Popover>

{/if}
