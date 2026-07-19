<script lang="ts">
	import type { Subject } from '$lib/types/school';
	import { ChevronDown, BookOpen } from '$lib/icons';
	import { t } from '$lib/i18n';
	import { teachingLogContext } from '$lib/teaching-log/context.svelte';
	import { cn } from '$lib/utils';
	import { dotByColor } from '../shared/drawer-constants.ts';

	const { s, isLast, showTeacher = true, onOpenDetail, catalogChapters }: {
		s: Subject;
		isLast: boolean;
		showTeacher?: boolean;
		onOpenDetail?: () => void;
		/** When set, shows programme chapters (catalogue) instead of the teaching log. */
		catalogChapters?: string[];
	} = $props();

	let open = $state(false);

	const entries = $derived(
		catalogChapters ? [] : teachingLogContext.resolveSubjectEntries(s.name, s.classId),
	);

	const chapters = $derived.by(() => {
		if (catalogChapters) {
			return catalogChapters.map(chapter => ({ chapter }));
		}
		const map: Record<string, { chapter: string; sessions: number; lastDate: string; progress: number }> = {};
		for (const e of entries) {
			const cur = map[e.chapter];
			if (!cur) {
				map[e.chapter] = { chapter: e.chapter, sessions: 1, lastDate: e.date, progress: e.progress };
			}
			else {
				cur.sessions += 1;
				if (e.date > cur.lastDate)
					cur.lastDate = e.date;
				cur.progress = Math.max(cur.progress, e.progress);
			}
		}
		return Object.values(map);
	});

	const emptyLabel = $derived(
		catalogChapters ? $t('subjects.chapters.emptyCatalog') : 'Aucun chapitre.',
	);
</script>

<div class={cn(!isLast && 'border-b border-border')}>
	<div class="flex items-stretch">
		<button
			type="button"
			onclick={() => (open = !open)}
			class="flex shrink-0 items-center px-3 text-muted-foreground transition-colors hover:bg-secondary"
			aria-expanded={open}
		>
			<ChevronDown
				class={cn('h-3.5 w-3.5 transition-transform', !open && '-rotate-90')}
			/>
		</button>
		<button
			type="button"
			onclick={() => onOpenDetail?.()}
			disabled={!onOpenDetail}
			class={cn(
				'flex min-w-0 flex-1 items-center gap-4 py-3 pr-4 text-left transition-colors',
				onOpenDetail ? 'hover:bg-secondary' : 'cursor-default',
			)}
		>
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
				{#if showTeacher}
					<span class="truncate">{s.teacher}</span>
				{/if}
			</div>
		</button>
	</div>
	{#if open}
		<div class="border-t border-border bg-secondary/20 px-4 py-3">
			<p class="mb-2 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
				Chapitres · {chapters.length}
			</p>
			{#if chapters.length === 0}
				<p class="text-xs text-muted-foreground">{emptyLabel}</p>
			{:else}
				<ul class="space-y-1.5">
					{#each chapters as c (c.chapter)}
						<li class="flex items-center gap-3 rounded-lg border border-border bg-card px-3 py-2">
							<BookOpen class="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
							<p class="min-w-0 flex-1 truncate text-sm font-medium">{c.chapter}</p>
						</li>
					{/each}
				</ul>
			{/if}
		</div>
	{/if}
</div>
