<script lang="ts">
	import type { Subject } from '$lib/types/school';
	import { page } from '$app/stores';
	import DrawerEntityHeader from '$lib/components/school/shared/DrawerEntityHeader.svelte';
	import { detailHref } from '$lib/detail-hrefs';
	import { appGoto } from '$lib/navigation/app-navigation';
	import { detailNavigationSearch } from '$lib/navigation/detail-navigation';
	import SubjectCatalogRow from '../../../components/SubjectCatalogRow.svelte';

	const { label, subtitle, items }: { label: string; subtitle: string; items: Subject[] } = $props();

	const totalHours = $derived(items.reduce((sum, subject) => sum + (subject.hoursPerWeek ?? 0), 0));

	function openSubject(subject: Subject) {
		const path = detailHref.configSubject(subject.id);
		appGoto(`${path}${detailNavigationSearch($page.url)}`);
	}
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
		{#each items as subject, idx (subject.id)}
			<SubjectCatalogRow
				{subject}
				isLast={idx === items.length - 1}
				onSelect={() => openSubject(subject)}
			/>
		{/each}
	</div>
</div>
