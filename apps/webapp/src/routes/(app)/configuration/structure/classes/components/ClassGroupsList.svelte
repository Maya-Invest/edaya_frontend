<script lang="ts">
	import type { ClassNode } from '$lib/types/school';
	import { page } from '$app/stores';
	import { academicContext } from '$lib/academic/context.svelte';
	import Button from '$lib/components/ui/button/button.svelte';
	import ListMoreMenu from '$lib/components/ui/ListMoreMenu.svelte';
	import ListPageHeader from '$lib/components/ui/ListPageHeader.svelte';
	import ListSearchField from '$lib/components/ui/ListSearchField.svelte';
	import PermissionGate from '$lib/components/ui/PermissionGate.svelte';
	import { t } from '$lib/i18n';
	import { Plus } from '$lib/icons';
	import { exportMatchingList } from '$lib/list/list-csv-export';
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

	const filteredClasses = $derived(filteredHierarchy.flatMap(group => group.classes));
	const filteredCount = $derived(filteredClasses.length);

</script>

<div class="animate-fade-in">
	<ListPageHeader
		level="section"
		title={$t('classGroups.title', { n: filteredCount })}
	>
		{#snippet search()}
			<ListSearchField
				value={classesPage.filters.values.q}
				oninput={event => classesPage.filters.setField('q', event.currentTarget.value)}
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
						onclick={() => modals.open('create')}
					>
						<Plus class="mr-1 h-4 w-4" />
						{$t('classGroups.add')}
					</Button>
				{/snippet}
			</PermissionGate>
		{/snippet}
		{#snippet more()}
			<ListMoreMenu
				exportOnly
				onExport={() => void exportMatchingList({
					filename: 'class-groups.csv',
					headers: ['name', 'gradeLevel', 'studentCount', 'attendanceMode'],
					loadAll: async () => filteredHierarchy.flatMap(group => group.classes.map((cls) => {
						const level = academicContext.gradeLevelById(cls.gradeLevelId);
						return [
							cls.name,
							level?.name ?? '',
							cls.studentCount,
							cls.attendanceMode,
						];
					})),
				})}
			/>
		{/snippet}
	</ListPageHeader>

	{#if filteredClasses.length}
		<!-- svelte-ignore a11y_no_noninteractive_tabindex (keyboard scrolling for the class table) -->
		<div role="region" aria-label={$t('structure.classes')} tabindex="0" class="overflow-x-auto rounded-2xl border border-border bg-card shadow-soft">
			<table class="w-full min-w-[24rem] text-sm">
				<thead class="border-b border-border bg-secondary/30 text-left">
					<tr>
						<th class="px-4 py-3 font-medium">{$t('classGroups.name')}</th>
						<th class="px-4 py-3 font-medium">{$t('classGroups.studentCount')}</th>
						<th class="px-4 py-3 font-medium">{$t('classGroups.attendanceMode')}</th>
					</tr>
				</thead>
				<tbody>
					{#each filteredClasses as cls (cls.id)}
						{@const isSelected = cls.id === selectedId}
						<tr data-entity-id={cls.id} class="border-b border-border/60 last:border-0">
							<td class="px-4 py-3">
								<button
									type="button"
									class={cn('w-full text-left transition-colors', isSelected && 'text-primary')}
									onclick={() => onSelect?.(cls)}
								>
									<p class="font-medium">{cls.name}</p>
									<p class="font-sans tabular-nums text-xs text-muted-foreground">{cls.id}</p>
								</button>
							</td>
							<td class="px-4 py-3 font-sans tabular-nums">{cls.studentCount}</td>
							<td class="px-4 py-3 text-muted-foreground">
								{$t(`classGroups.attendanceMode.${cls.attendanceMode}`)}
							</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
	{:else}
		<p class="py-10 text-center text-sm text-muted-foreground">{$t('structure.emptyClasses')}</p>
	{/if}
</div>

<ClassGroupFormModal bind:open={createOpen.open} defaultGradeLevelId={classesPage.filters.values.gradeLevel} />
