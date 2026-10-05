<script lang="ts">
	import { cn } from '$lib/utils';

	const {
		current,
		total,
		label,
	}: {
		current: number;
		total: number;
		label?: string;
	} = $props();

	const percent = $derived(total > 0 ? Math.round((current / total) * 100) : 0);
</script>

<div class="space-y-2" data-testid="import-progress-bar">
	{#if label}
		<p class="text-sm text-muted-foreground">{label}</p>
	{/if}
	<div class="h-2 overflow-hidden rounded-full bg-secondary">
		<div
			class={cn('h-full rounded-full bg-primary transition-[width] duration-200')}
			style={`width: ${percent}%`}
			role="progressbar"
			aria-valuemin={0}
			aria-valuemax={total}
			aria-valuenow={current}
			aria-label={label}
		></div>
	</div>
	<p class="text-xs text-muted-foreground">{current} / {total}</p>
</div>
