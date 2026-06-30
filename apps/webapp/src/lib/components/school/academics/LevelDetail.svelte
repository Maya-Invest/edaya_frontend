<script lang="ts">
	import type { Subject } from '$lib/types/school';
	import SubjectChaptersRow from './SubjectChaptersRow.svelte';

	const { label, subtitle, items }: { label: string; subtitle: string; items: Subject[] } = $props();

	const totalHours = $derived(items.reduce((s, x) => s + x.hoursPerWeek, 0));
</script>

<div class="space-y-5">
	<div>
		<p class="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">{subtitle}</p>
		<h3 class="font-display text-2xl font-semibold">{label}</h3>
		<div class="mt-2 flex items-center gap-3 text-xs text-muted-foreground">
			<span class="rounded-full bg-secondary px-2 py-0.5 font-mono tabular-nums">
				{items.length} matière{items.length > 1 ? 's' : ''}
			</span>
			<span class="font-mono tabular-nums">{totalHours}h / sem.</span>
		</div>
	</div>

	<div class="overflow-hidden rounded-2xl border border-border bg-card">
		{#each items as s, idx (s.id)}
			<SubjectChaptersRow {s} isLast={idx === items.length - 1} />
		{/each}
	</div>
</div>
