<script lang="ts">
	import { cn } from '$lib/utils';

	const { label, steps, current, onSelect }: {
		label: string;
		steps: readonly { key: string; label: string; disabled?: boolean; reason?: string }[];
		current: string;
		onSelect: (key: string) => void;
	} = $props();
	const id = $props.id();
</script>

<nav aria-label={label} class="max-h-[25dvh] overflow-auto">
	<ol class="flex flex-wrap gap-2">
		{#each steps as step, index (step.key)}
			<li class="min-w-0">
				<button type="button" disabled={step.disabled} aria-current={current === step.key ? 'step' : undefined}
					aria-describedby={step.disabled && step.reason ? `${id}-${step.key}-reason` : undefined}
					class={cn('ui-nav-target text-left', current === step.key && 'bg-primary/10 text-primary ring-1 ring-inset ring-primary')}
					data-testid={`task-step-${step.key}`} onclick={() => onSelect(step.key)}>
					<span class="shrink-0 whitespace-nowrap tabular-nums" aria-hidden="true">{index + 1}.</span>{step.label}
				</button>
				{#if step.disabled && step.reason}<p id={`${id}-${step.key}-reason`} class="max-w-64 px-4 text-xs text-muted-foreground">{step.reason}</p>{/if}
			</li>
		{/each}
	</ol>
</nav>
