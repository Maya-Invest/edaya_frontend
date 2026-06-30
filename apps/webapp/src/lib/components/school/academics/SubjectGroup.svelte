<script lang="ts">
	import type { SubjectGroupItem } from '../shared/drawer-types.ts';
	import { ChevronDown } from '$lib/icons';
	import { cn } from '$lib/utils';
	import { fmtDateFr } from '../shared/drawer-constants.ts';

	const { subject, items, subjectAvg }: { subject: string; items: SubjectGroupItem[]; subjectAvg: number | null }
		= $props();

	const collapsible = $derived(items.length > 1);
	let open = $state(false);
	const graded = $derived(items.filter(it => it.mark !== null));
	const shown = $derived(collapsible ? open : true);
</script>

<div class="overflow-hidden rounded-xl border border-border bg-card">
	<button
		type="button"
		onclick={() => collapsible && (open = !open)}
		class={cn(
			'flex w-full items-center justify-between border-b border-border bg-secondary/40 px-3 py-2 text-left',
			collapsible ? 'cursor-pointer hover:bg-secondary/60' : 'cursor-default',
			!shown && 'border-b-0',
		)}
	>
		<div class="flex items-center gap-2">
			{#if collapsible}
				<ChevronDown class={cn('h-3.5 w-3.5 text-muted-foreground transition-transform', !shown && '-rotate-90')} />
			{/if}
			<span class="text-sm font-semibold">{subject}</span>
			<span class="text-[10px] uppercase tracking-wider text-muted-foreground">
				{items.length} éval. · {graded.length} notées
			</span>
		</div>
		<p class="font-display text-lg tabular-nums">
			{subjectAvg !== null ? subjectAvg.toFixed(1) : '—'}
			<span class="ml-0.5 text-xs font-normal text-muted-foreground">/20</span>
		</p>
	</button>
	{#if shown}
		<div class="divide-y divide-border">
			{#each items as { e, mark } (e.id)}
				<div class="px-3 py-2">
					<div class="flex items-center justify-between gap-2">
						<p class="text-sm font-medium">{e.title}</p>
						<p class="font-mono text-sm tabular-nums">
							{mark !== null ? mark.toFixed(1) : '—'}
							<span class="ml-0.5 text-xs text-muted-foreground">/{e.outOf}</span>
						</p>
					</div>
					<p class="mt-0.5 font-mono text-[10px] text-muted-foreground">
						{fmtDateFr(e.date)} · ×{e.coefficient}
					</p>
				</div>
			{/each}
		</div>
	{/if}
</div>
