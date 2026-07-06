<script lang="ts">
	import { cn } from '$lib/utils';

	const {
		tabs,
		active,
		onSelect,
		scrollable = false,
	}: {
		tabs: readonly { key: string; label: string }[];
		active: string;
		onSelect: (key: string) => void;
		scrollable?: boolean;
	} = $props();
</script>

<div
	data-testid="drawer-tab-bar"
	class={cn(
		'flex items-center gap-1 rounded-full border border-border bg-secondary/40 p-1 text-xs',
		scrollable && 'overflow-x-auto',
	)}
>
	{#each tabs as { key, label } (key)}
		<button
			type="button"
			onclick={() => onSelect(key)}
			class={cn(
				'whitespace-nowrap rounded-full px-2.5 py-1.5 font-medium transition',
				scrollable ? '' : 'flex-1',
				active === key
					? 'bg-card text-foreground shadow-soft'
					: 'text-muted-foreground hover:text-foreground',
			)}
		>
			{label}
		</button>
	{/each}
</div>
