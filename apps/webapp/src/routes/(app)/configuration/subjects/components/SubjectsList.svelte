<script lang="ts">
	import type { Subject } from '$lib/types/school';
	import { page } from '$app/stores';
	import { academicContext } from '$lib/academic/context.svelte';
	import { sortGradeLevels } from '$lib/academic/grade-level-sort';
	import { groupSubjectsByGradeLevel } from '$lib/academic/subject-level-groups';
	import Button from '$lib/components/ui/button/button.svelte';
	import FilterSelect from '$lib/components/ui/filter-select.svelte';
	import ListMoreMenu from '$lib/components/ui/ListMoreMenu.svelte';
	import ListPageHeader from '$lib/components/ui/ListPageHeader.svelte';
	import ListSearchField from '$lib/components/ui/ListSearchField.svelte';
	import PermissionGate from '$lib/components/ui/PermissionGate.svelte';
	import { t } from '$lib/i18n';
	import { Plus } from '$lib/icons';
	import { ListFiltersState } from '$lib/list/list-filters-state.svelte';
	import { readConfigSubjectListFilters, writeConfigSubjectListFilters } from '$lib/list/list-url-filters';
	import { bindUrlModal, createUrlSyncedModals } from '$lib/modal/modal-state.svelte';
	import { appGoto } from '$lib/navigation/app-navigation';
	import { cn } from '$lib/utils';
	import { getSubjectsPageState } from '../subjects-page.svelte';
	import SubjectCatalogCreateModal from './SubjectCatalogCreateModal.svelte';
	import SubjectCatalogRow from './SubjectCatalogRow.svelte';

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

	const modals = createUrlSyncedModals({ allowed: ['create-subject'], getUrl: () => $page.url });
	$effect(() => {
		modals.hydrate();
	});
	const createSubjectOpen = bindUrlModal(modals, 'create-subject');

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
		...sortGradeLevels(academicContext.gradeLevels)
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
			<ListSearchField bind:value={listFilters.values.q} oninput={() => listFilters.scheduleSync()} />
		{/snippet}
		{#snippet filters()}
			<FilterSelect
				value={listFilters.values.gradeLevel}
				class="h-9 min-w-[10rem] rounded-full text-xs"
				options={gradeLevelFilterOptions}
				onchange={handleGradeLevelFilterChange}
			/>
		{/snippet}
		{#snippet primary()}
			<PermissionGate permission="SCHOOL_STRUCTURE_CONFIGURE" mode="disable">
				{#snippet children({ disabled, title })}
					<Button
						size="sm"
						class="rounded-full"
						{disabled}
						{title}
						onclick={() => (createSubjectOpen.open = true)}
					>
						<Plus class="mr-1 h-4 w-4" />
						{$t('subjects.createTitle')}
					</Button>
				{/snippet}
			</PermissionGate>
		{/snippet}
		{#snippet more()}
			<ListMoreMenu exportOnly />
		{/snippet}
	</ListPageHeader>

	<SubjectCatalogCreateModal
		bind:open={createSubjectOpen.open}
		defaultGradeLevelId={selectedGradeLevelId}
	/>

	<div class="space-y-8">
		{#each visibleGroups as g (g.key)}
			{@const totalHours = g.items.reduce((sum, s) => sum + (s.hoursPerWeek ?? 0), 0)}
			{@const hoursLabel = totalHours > 0 ? $t('subjects.hoursPerWeek', { h: totalHours }) : '—'}
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
						<span class="font-mono tabular-nums">{hoursLabel}</span>
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
			<div class="space-y-4 py-10 text-center">
				<p class="text-sm text-muted-foreground">
					{selectedGradeLevelId === 'all'
						? $t('subjects.none')
						: $t('subjects.noneForGradeLevel')}
				</p>
				<PermissionGate permission="SCHOOL_STRUCTURE_CONFIGURE" mode="disable">
					{#snippet children({ disabled, title })}
						<Button
							variant="outline"
							size="sm"
							class="rounded-full"
							{disabled}
							{title}
							onclick={() => (createSubjectOpen.open = true)}
						>
							<Plus class="mr-1 h-4 w-4" />
							{$t('subjects.createTitle')}
						</Button>
					{/snippet}
				</PermissionGate>
			</div>
		{/each}
	</div>
</div>
