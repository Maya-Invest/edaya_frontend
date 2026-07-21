<script lang="ts">
	import type { Subject } from '$lib/types/school';
	import { page } from '$app/stores';
	import { academicContext } from '$lib/academic/context.svelte';
	import { groupSubjectsByGradeLevel } from '$lib/academic/subject-level-groups';
	import FilterSelect from '$lib/components/ui/filter-select.svelte';
	import Input from '$lib/components/ui/input/input.svelte';
	import ListMoreMenu from '$lib/components/ui/ListMoreMenu.svelte';
	import ListPageHeader from '$lib/components/ui/ListPageHeader.svelte';
	import { t } from '$lib/i18n';
	import { Search } from '$lib/icons';
	import { ListFiltersState } from '$lib/list/list-filters-state.svelte';
	import { readConfigSubjectListFilters, writeConfigSubjectListFilters } from '$lib/list/list-url-filters';
	import { appGoto } from '$lib/navigation/app-navigation';
	import { cn } from '$lib/utils';
	import SubjectCatalogRow from './SubjectCatalogRow.svelte';
	import { getSubjectsPageState } from '../subjects-page.svelte';

	const {
		onSelect,
		selectedId,
	}: {
		onSelect?: (s: Subject) => void;
		selectedId?: string;
	} = $props();

	const subjectsPage = getSubjectsPageState();
	const subjects = $derived(subjectsPage.subjects());
	const classes = $derived(academicContext.classes);

	const listFilters = new ListFiltersState<{ q: string; gradeLevel: string }>(
		{
			getUrl: () => $page.url,
			write: writeConfigSubjectListFilters,
			goto: href => appGoto(href, { replaceState: true, keepFocus: true, noScroll: true }),
		},
		() => readConfigSubjectListFilters($page.url),
	);

	function matchesSearch(s: Subject, needle: string) {
		if (!needle)
			return true;
		return s.name.toLowerCase().includes(needle)
			|| s.category.toLowerCase().includes(needle)
			|| s.description.toLowerCase().includes(needle);
	}

	const filteredSubjects = $derived(
		subjects.filter(s => matchesSearch(s, listFilters.values.q.trim().toLowerCase())),
	);

	const groups = $derived(
		groupSubjectsByGradeLevel(
			filteredSubjects,
			classes,
			academicContext.gradeLevels,
		),
	);

	const selectedGradeLevelId = $derived(listFilters.values.gradeLevel);

	const validGradeLevelIds = $derived(
		new Set(academicContext.gradeLevels.map(level => level.id)),
	);

	function normalizeGradeLevelFilter(value: string): string {
		if (value === 'all') {
			return 'all';
		}
		if (validGradeLevelIds.size === 0) {
			return value;
		}
		return validGradeLevelIds.has(value) ? value : 'all';
	}

	function gradeLevelFromUrl(url: URL): string {
		const raw = url.searchParams.get('gradeLevel');
		if (!raw) {
			return 'all';
		}
		return normalizeGradeLevelFilter(raw);
	}

	const gradeLevelFilterOptions = $derived([
		{ value: 'all', label: $t('subjects.allGradeLevels') },
		...academicContext.gradeLevels
			.slice()
			.sort((left, right) => left.order - right.order)
			.map(level => ({ value: level.id, label: level.name })),
	]);

	const visibleGroups = $derived(
		selectedGradeLevelId === 'all'
			? groups
			: groups.filter(group => group.key === selectedGradeLevelId),
	);

	function handleGradeLevelFilterChange(value: string) {
		listFilters.patchImmediate({ gradeLevel: value });
	}

	$effect(() => {
		const url = $page.url;
		listFilters.hydrate({
			q: readConfigSubjectListFilters(url).q,
			gradeLevel: gradeLevelFromUrl(url),
		});
	});

	$effect(() => {
		if (!listFilters.ready || selectedGradeLevelId === 'all') {
			return;
		}
		const section = document.getElementById(`subject-level-${selectedGradeLevelId}`);
		section?.scrollIntoView({ behavior: 'smooth', block: 'start' });
	});
</script>

<div class="animate-fade-in">
	<ListPageHeader
		eyebrow={$t('subjects.curriculum')}
		title={$t('subjects.count', { n: filteredSubjects.length })}
	>
		{#snippet search()}
			<div class="relative">
				<Search
					class="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground"
				/>
				<Input
					bind:value={listFilters.values.q}
					oninput={() => listFilters.scheduleSync()}
					placeholder={$t('common.search')}
					class="h-9 w-56 rounded-full pl-9 text-sm"
				/>
			</div>
		{/snippet}
		{#snippet filters()}
			<FilterSelect
				value={listFilters.values.gradeLevel}
				class="h-9 min-w-[10rem] rounded-full text-xs"
				options={gradeLevelFilterOptions}
				onchange={handleGradeLevelFilterChange}
			/>
		{/snippet}
		{#snippet more()}
			<ListMoreMenu exportOnly />
		{/snippet}
	</ListPageHeader>

	<div class="space-y-8">
		{#each visibleGroups as g (g.key)}
			{@const totalHours = g.items.reduce((sum, s) => sum + s.hoursPerWeek, 0)}
			{@const emphasize = selectedGradeLevelId !== 'all'}
			<section
				id={`subject-level-${g.key}`}
				class={cn(
					'scroll-mt-6',
					emphasize && 'rounded-2xl ring-2 ring-accent/45 ring-offset-2 ring-offset-background',
				)}
			>
				<div class="mb-3 flex items-end justify-between border-b border-border pb-2">
					<div class="flex items-baseline gap-3">
						<h3 class={cn(
							'font-display font-semibold',
							emphasize ? 'text-lg text-foreground' : 'text-base',
						)}>
							{g.label}
						</h3>
						{#if g.subtitle}
							<span class="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
								{g.subtitle}
							</span>
						{/if}
						<span class="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
							{$t('subjects.count', { n: g.count })}
						</span>
					</div>
					<div class="text-xs text-muted-foreground">
						<span class="font-mono tabular-nums">{$t('subjects.hoursPerWeek', { h: totalHours })}</span>
					</div>
				</div>

				<div class="overflow-hidden rounded-2xl border border-border bg-card shadow-soft">
					{#each g.items as subject, idx (subject.id)}
						<SubjectCatalogRow
							{subject}
							isLast={idx === g.items.length - 1}
							active={selectedId === subject.id}
							onSelect={() => onSelect?.(subject)}
						/>
					{/each}
				</div>
			</section>
		{:else}
			<p class="py-10 text-center text-sm text-muted-foreground">
				{selectedGradeLevelId === 'all'
					? $t('subjects.none')
					: $t('subjects.noneForGradeLevel')}
			</p>
		{/each}
	</div>
</div>
