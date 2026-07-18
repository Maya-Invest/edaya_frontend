<script lang="ts">
	import type { Subject } from '$lib/types/school';
	import { dotByColor } from '$lib/components/school/shared/drawer-constants';
	import { ChevronDown, BookOpen } from '$lib/icons';
	import { cn } from '$lib/utils';
	import { getSubjectsPageState } from '../../../subjects-page.svelte';

	const { s, isLast }: { s: Subject; isLast: boolean } = $props();

	const subjectsPage = getSubjectsPageState();
	let open = $state(false);

	const entries = $derived(subjectsPage.logEntriesForSubject(s));

	const chapters = $derived.by(() => {
		const map: Record<string, { chapter: string; sessions: number; lastDate: string; progress: number }> = {};
		for (const entry of entries) {
			const current = map[entry.chapter];
			if (!current) {
				map[entry.chapter] = { chapter: entry.chapter, sessions: 1, lastDate: entry.date, progress: entry.progress };
			}
			else {
				current.sessions += 1;
				if (entry.date > current.lastDate)
					current.lastDate = entry.date;
				current.progress = Math.max(current.progress, entry.progress);
			}
		}
		return Object.values(map);
	});
</script>

<div class={cn(!isLast && 'border-b border-border')}>
	<button
		type="button"
		onclick={() => (open = !open)}
		class="flex w-full items-center gap-4 px-4 py-3 text-left transition-colors hover:bg-secondary"
	>
		<ChevronDown
			class={cn('h-3.5 w-3.5 shrink-0 text-muted-foreground transition-transform', !open && '-rotate-90')}
		/>
		<div class={cn('h-8 w-1.5 shrink-0 rounded-full', dotByColor[s.color])}></div>
		<div class="min-w-0 flex-1">
			<div class="flex items-center gap-2">
				<span class="font-display text-sm font-semibold">{s.name}</span>
				<span
					class="rounded-full bg-secondary px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-muted-foreground"
				>
					{s.category}
				</span>
			</div>
			<p class="mt-0.5 truncate text-xs text-muted-foreground">{s.description}</p>
		</div>
		<div class="flex shrink-0 items-center gap-4 text-xs text-muted-foreground">
			<span class="font-mono tabular-nums">{s.hoursPerWeek}h</span>
			<span class="truncate">{s.teacher}</span>
		</div>
	</button>
	{#if open}
		<div class="border-t border-border bg-secondary/20 px-4 py-3">
			<p class="mb-2 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
				Chapitres · {chapters.length}
			</p>
			{#if chapters.length === 0}
				<p class="text-xs text-muted-foreground">Aucun chapitre.</p>
			{:else}
				<ul class="space-y-1.5">
					{#each chapters as chapter (chapter.chapter)}
						<li class="flex items-center gap-3 rounded-lg border border-border bg-card px-3 py-2">
							<BookOpen class="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
							<p class="min-w-0 flex-1 truncate text-sm font-medium">{chapter.chapter}</p>
						</li>
					{/each}
				</ul>
			{/if}
		</div>
	{/if}
</div>
