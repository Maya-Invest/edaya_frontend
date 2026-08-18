<script lang="ts">
	import type { ClassNode } from '$lib/types/school';
	import { page } from '$app/stores';
	import { academicContext } from '$lib/academic/context.svelte';
	import { sortGradeLevels } from '$lib/academic/grade-level-sort';
	import Button from '$lib/components/ui/button/button.svelte';
	import FilterSelect from '$lib/components/ui/filter-select.svelte';
	import FilterPanel from '$lib/components/ui/FilterPanel.svelte';
	import ListMoreMenu from '$lib/components/ui/ListMoreMenu.svelte';
	import ListPageHeader from '$lib/components/ui/ListPageHeader.svelte';
	import ListSearchField from '$lib/components/ui/ListSearchField.svelte';
	import PermissionGate from '$lib/components/ui/PermissionGate.svelte';
	import { t } from '$lib/i18n';
	import { Layers, Plus } from '$lib/icons';
	import { bindUrlModal, createUrlSyncedModals } from '$lib/modal/modal-state.svelte';
	import { cn } from '$lib/utils';
	import { getClassesPageState } from '../classes-page.svelte';
	import ClassGroupFormModal from './ClassGroupFormModal.svelte';

	const {
		onSelect,
		selectedId,
	}: {
		onSelect?: (classGroup: ClassNode) => void;
		selectedId?: string;
	} = $props();

	const classesPage = getClassesPageState();

	const modals = createUrlSyncedModals({ allowed: ['create'], getUrl: () => $page.url });
	$effect(() => {
		modals.hydrate();
	});
	const createOpen = bindUrlModal(modals, 'create');

	const gradeLevelOptions = $derived([
		{ value: 'all', label: $t('filter.all') },
		...sortGradeLevels(academicContext.gradeLevels)
			.map(level => ({ value: level.id, label: level.name })),
	]);

	const filteredHierarchy = $derived.by(() => {
		const needle = classesPage.filters.values.q.trim().toLowerCase();
		return academicContext.hierarchy
			.map(group => ({
				...group,
				classes: group.classes.filter((cls) => {
					if (
						classesPage.filters.values.gradeLevel !== 'all'
						&& cls.gradeLevelId !== classesPage.filters.values.gradeLevel
					) {
						return false;
					}
					if (!needle) {
						return true;
					}
					const level = academicContext.gradeLevelById(cls.gradeLevelId);
					return cls.name.toLowerCase().includes(needle)
						|| cls.id.toLowerCase().includes(needle)
						|| (level?.name.toLowerCase().includes(needle) ?? false)
						|| group.level.toLowerCase().includes(needle);
				}),
			}))
			.filter(group => group.classes.length > 0);
	});

	const filteredCount = $derived(
		filteredHierarchy.reduce((acc, group) => acc + group.classes.length, 0),
	);

	const gradeLevelFilterActive = $derived(
		classesPage.filters.values.gradeLevel !== 'all' ? 1 : 0,
	);
</script>

<div class="animate-fade-in">
	<ListPageHeader
		eyebrow={$t('classGroups.subtitle')}
		title={$t('classGroups.title', { n: filteredCount })}
	>
		{#snippet search()}
			<ListSearchField
				value={classesPage.filters.values.q}
				oninput={event => classesPage.filters.setField('q', event.currentTarget.value)}
			/>
		{/snippet}
		{#snippet filters()}
			<FilterPanel activeCount={gradeLevelFilterActive} title={$t('gradeLevels.subtitle')}>
				<FilterSelect
					value={classesPage.filters.values.gradeLevel}
					onchange={value => classesPage.filters.patchImmediate({ gradeLevel: value })}
					class="h-9 w-full rounded-md text-xs"
					options={gradeLevelOptions}
				/>
			</FilterPanel>
		{/snippet}
		{#snippet primary()}
			<PermissionGate permission="SCHOOL_STRUCTURE_CONFIGURE" mode="disable">
				{#snippet children({ disabled, title })}
					<Button
						size="sm"
						class="rounded-full"
						{disabled}
						{title}
						onclick={() => modals.open('create')}
					>
						<Plus class="mr-1 h-4 w-4" />
						{$t('classGroups.add')}
					</Button>
				{/snippet}
			</PermissionGate>
		{/snippet}
		{#snippet more()}
			<ListMoreMenu exportOnly />
		{/snippet}
	</ListPageHeader>

	<div class="space-y-6">
		{#each filteredHierarchy as group (group.level)}
			<section>
				<h3 class="mb-3 flex items-center gap-2 font-display text-lg font-semibold">
					<Layers class="h-4 w-4 text-muted-foreground" />
					{group.level}
				</h3>
				<div class="overflow-hidden rounded-2xl border border-border bg-card shadow-soft">
					<table class="w-full text-sm">
						<thead class="border-b border-border bg-secondary/30 text-left">
							<tr>
								<th class="px-4 py-3 font-medium">{$t('classGroups.name')}</th>
								<th class="px-4 py-3 font-medium">{$t('classGroups.gradeLevel')}</th>
								<th class="px-4 py-3 font-medium">{$t('classGroups.studentCount')}</th>
								<th class="px-4 py-3 font-medium">{$t('classGroups.attendanceMode')}</th>
							</tr>
						</thead>
						<tbody>
							{#each group.classes as cls (cls.id)}
								{@const level = academicContext.gradeLevelById(cls.gradeLevelId)}
								{@const isSelected = cls.id === selectedId}
								<tr class="border-b border-border/60 last:border-0">
									<td class="px-4 py-3">
										<button
											type="button"
											class={cn('w-full text-left transition-colors', isSelected && 'text-primary')}
											onclick={() => onSelect?.(cls)}
										>
											<p class="font-medium">{cls.name}</p>
											<p class="font-mono text-[10px] text-muted-foreground">{cls.id}</p>
										</button>
									</td>
									<td class="px-4 py-3 text-muted-foreground">{level?.name ?? '—'}</td>
									<td class="px-4 py-3 font-mono">{cls.studentCount}</td>
									<td class="px-4 py-3 text-muted-foreground">
										{$t(`classGroups.attendanceMode.${cls.attendanceMode}`)}
									</td>
								</tr>
							{/each}
						</tbody>
					</table>
				</div>
			</section>
		{/each}
	</div>
</div>

<ClassGroupFormModal bind:open={createOpen.open} />
