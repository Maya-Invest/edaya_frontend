<script lang="ts">
	import type { Subject } from '$lib/types/school';
	import { page } from '$app/stores';
	import { academicContext } from '$lib/academic/context.svelte';
	import { groupSubjectsByGradeLevel } from '$lib/academic/subject-level-groups';
	import Button from '$lib/components/ui/button/button.svelte';
	import ListMoreMenu from '$lib/components/ui/ListMoreMenu.svelte';
	import ListPageHeader from '$lib/components/ui/ListPageHeader.svelte';
	import ListSearchField from '$lib/components/ui/ListSearchField.svelte';
	import PermissionGate from '$lib/components/ui/PermissionGate.svelte';
	import { t } from '$lib/i18n';
	import { Plus } from '$lib/icons';
	import { exportMatchingList } from '$lib/list/list-csv-export';
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
		onEdit,
		selectedId,
	}: {
		onSelect?: (s: Subject) => void;
		selectedId?: string;
		onEdit?: (entity: Subject) => void;
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

	const visibleGroups = $derived(
		selectedGradeLevelId === 'all'
			? groups
			: groups.filter(group => group.key === selectedGradeLevelId),
	);

	$effect(() => {
		listFilters.hydrate(readConfigSubjectListFilters($page.url));
	});

</script>

<div class="animate-fade-in">
	<ListPageHeader
		level="section"
		title={$t('subjects.count', { n: visibleGroups.reduce((count, group) => count + group.items.length, 0) })}
	>
		{#snippet search()}
			<ListSearchField value={listFilters.values.q} oninput={event => listFilters.setField('q', event.currentTarget.value)} />
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
			<ListMoreMenu
				exportOnly
				onExport={() => void exportMatchingList({
					filename: 'subjects.csv',
					headers: ['name', 'category', 'periodsPerWeek', 'gradeLevel'],
					loadAll: async () => visibleGroups.flatMap(group => group.items.map(subject => [
						subject.name,
						subject.category,
						subject.periodsPerWeek ?? '',
						group.label,
					])),
				})}
			/>
		{/snippet}
	</ListPageHeader>

	<SubjectCatalogCreateModal
		bind:open={createSubjectOpen.open}
		defaultGradeLevelId={selectedGradeLevelId}
	/>

	<div class="space-y-8">
		{#each visibleGroups as g (g.key)}
			{@const emphasize = selectedGradeLevelId !== 'all'}
			<section
				id={`subject-level-${g.key}`}
				class={cn(
					'scroll-mt-6',
					emphasize && 'rounded-2xl',
				)}
			>

				<div class="overflow-hidden rounded-2xl border border-border bg-card shadow-soft">
					{#each g.items as subject (subject.id)}
						<SubjectCatalogRow
							{subject}
							active={selectedId === subject.id}
							onSelect={() => onSelect?.(subject)}
							onEdit={() => onEdit?.(subject)}
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
