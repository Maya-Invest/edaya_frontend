<script lang="ts">
	import type { Snippet } from 'svelte';
	import Button from '$lib/components/ui/button/button.svelte';
	import * as Popover from '$lib/components/ui/popover';
	import { t } from '$lib/i18n';
	import { MoreHorizontal } from '$lib/icons';
	import { cn } from '$lib/utils';

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
</script>

<Popover.Popover bind:open>
	<Popover.PopoverTrigger>
		{#snippet child({ props })}
			<Button
				{...props}
				variant="ghost"
				size="sm"
				class={cn('h-8 w-8 rounded-full p-0', className)}
				aria-label={label ?? $t('list.rowActions')}
			>
				<MoreHorizontal class="h-4 w-4" />
			</Button>
		{/snippet}
	</Popover.PopoverTrigger>
	<Popover.PopoverContent class="w-44 p-1" align="end">
		<div class="p-1">
			{@render children()}
		</div>
	</Popover.PopoverContent>
</Popover.Popover>
