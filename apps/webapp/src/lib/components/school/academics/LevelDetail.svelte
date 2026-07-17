<script lang="ts">
	import type { Subject } from '$lib/types/school';
	import DrawerEntityHeader from '../shared/DrawerEntityHeader.svelte';
	import SubjectChaptersRow from './SubjectChaptersRow.svelte';

	const { label, subtitle, items }: { label: string; subtitle: string; items: Subject[] } = $props();

	const totalHours = $derived(items.reduce((s, x) => s + x.hoursPerWeek, 0));
</script>

<div class="space-y-5">
	<DrawerEntityHeader name={label} summary={subtitle}>
		{#snippet chips()}
			<span class="rounded-full bg-secondary px-2 py-0.5 font-mono text-[10px] tabular-nums">
				{items.length} matière{items.length > 1 ? 's' : ''}
			</span>
			<span class="rounded-full bg-secondary px-2 py-0.5 font-mono text-[10px] tabular-nums">
				{totalHours}h / sem.
			</span>
		{/snippet}
	</DrawerEntityHeader>

	<div class="overflow-hidden rounded-2xl border border-border bg-card">
		{#each items as s, idx (s.id)}
			<SubjectChaptersRow {s} isLast={idx === items.length - 1} />
		{/each}
	</div>
</div>
