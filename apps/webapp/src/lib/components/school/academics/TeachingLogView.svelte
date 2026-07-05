<script lang="ts">
	import type { Subject } from '$lib/types/school';
	import { page } from '$app/stores';
	import Input from '$lib/components/ui/input/input.svelte';
	import ListPageHeader from '$lib/components/ui/ListPageHeader.svelte';
	import ListMoreMenu from '$lib/components/ui/ListMoreMenu.svelte';
	import { detailDataContext } from '$lib/detail-data/context.svelte';
	import { t } from '$lib/i18n';
	import { Search, Sparkles } from '$lib/icons';
	import { readTeachingListFilters, writeTeachingListFilters } from '$lib/list/list-url-filters';
	import { appGoto } from '$lib/navigation/app-navigation';
	import { teachingLogContext } from '$lib/teaching-log/context.svelte';
	import SubjectsView from './SubjectsView.svelte';

	const {
		classId,
		onSelectSubject,
		selectedSubjectId,
	}: {
		classId: string;
		onSelectSubject?: (s: Subject) => void;
		selectedSubjectId?: string;
	} = $props();

	const initialFilters = $derived(readTeachingListFilters($page.url));

	let q = $state('');
	let filtersReady = $state(false);

	const classSubjects = $derived(detailDataContext.subjectsForClass(classId));
	const filteredSubjects = $derived(
		classSubjects.filter((s) => {
			const needle = q.trim().toLowerCase();
			if (!needle)
				return true;
			return s.name.toLowerCase().includes(needle)
				|| s.teacher.toLowerCase().includes(needle)
				|| s.category.toLowerCase().includes(needle);
		}),
	);

	const entries = $derived(teachingLogContext.resolveClassEntries(classId, classSubjects));
	const allSubjects = $derived(Array.from(new Set(entries.map(e => e.subject))));

	const overallProgress = $derived(
		Math.round(
			allSubjects.reduce((acc, name) => {
				const latest = entries
					.filter(e => e.subject === name)
					.sort((a, b) => (a.date < b.date ? 1 : -1))[0];
				return acc + (latest?.progress ?? 0);
			}, 0) / Math.max(1, allSubjects.length),
		),
	);

	function getProgress(s: Subject) {
		const es = teachingLogContext.resolveSubjectEntries(s.name, s.classId);
		const byCh: Record<string, number> = {};
		for (const e of es) {
			const prev = byCh[e.chapter];
			if (prev === undefined || e.progress > prev)
				byCh[e.chapter] = e.progress;
		}
		const arr = Object.values(byCh);
		return arr.length ? Math.round(arr.reduce((a, p) => a + p, 0) / arr.length) : 0;
	}

	function syncFiltersToUrl() {
		const href = writeTeachingListFilters($page.url, { q });
		appGoto(href, { replaceState: true, keepFocus: true, noScroll: true });
	}

	$effect(() => {
		const next = initialFilters;
		q = next.q;
		filtersReady = true;
	});

	let searchTimer: ReturnType<typeof setTimeout> | undefined;
	function scheduleFilterSync() {
		if (!filtersReady)
			return;
		clearTimeout(searchTimer);
		searchTimer = setTimeout(syncFiltersToUrl, 250);
	}
</script>

<div class="animate-fade-in">
	<ListPageHeader
		eyebrow={$t('teaching.eyebrow')}
		title={$t('teaching.title')}
		description={$t('teaching.subtitle')}
	>
		{#snippet search()}
			<div class="relative">
				<Search
					class="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground"
				/>
				<Input
					bind:value={q}
					oninput={scheduleFilterSync}
					placeholder={$t('common.search')}
					class="h-9 w-56 rounded-full pl-9 text-sm"
				/>
			</div>
		{/snippet}
		{#snippet filters()}
			<div
				class="flex items-center gap-3 rounded-full border border-border bg-card px-4 py-2 shadow-soft"
			>
				<Sparkles class="h-4 w-4 text-accent" />
				<div>
					<p class="text-[10px] uppercase tracking-wider text-muted-foreground">
						{$t('teaching.overallProgress')}
					</p>
					<div class="mt-0.5 flex items-center gap-2">
						<div class="h-1.5 w-28 overflow-hidden rounded-full bg-secondary">
							<div class="h-full bg-accent" style:width="{overallProgress}%"></div>
						</div>
						<span class="font-mono text-xs">{overallProgress}%</span>
					</div>
				</div>
			</div>
		{/snippet}
		{#snippet more()}
			<ListMoreMenu exportOnly />
		{/snippet}
	</ListPageHeader>

	<div class="mb-2">
		<p class="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
			{$t('teaching.progressByMatter')}
		</p>
	</div>

	<SubjectsView
		embedded
		{classId}
		subjects={filteredSubjects}
		onSelect={s => onSelectSubject?.(s)}
		selectedId={selectedSubjectId}
		{getProgress}
	/>
</div>
