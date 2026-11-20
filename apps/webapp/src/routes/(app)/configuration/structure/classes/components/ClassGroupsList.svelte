<script lang="ts">
	import type { ClassNode } from '$lib/types/school';
	import { page } from '$app/stores';
	import { academicContext } from '$lib/academic/context.svelte';
	import Button from '$lib/components/ui/button/button.svelte';
	import ListEntityTable from '$lib/components/ui/ListEntityTable.svelte';
	import ListMoreMenu from '$lib/components/ui/ListMoreMenu.svelte';
	import ListPageHeader from '$lib/components/ui/ListPageHeader.svelte';
	import ListSearchField from '$lib/components/ui/ListSearchField.svelte';
	import PermissionGate from '$lib/components/ui/PermissionGate.svelte';
	import { t } from '$lib/i18n';
	import { Plus } from '$lib/icons';
	import { exportMatchingList } from '$lib/list/list-csv-export';
	import { bindUrlModal, createUrlSyncedModals } from '$lib/modal/modal-state.svelte';
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
			<PermissionGate permission="SCHOOL_CONFIGURE" mode="disable">
				{#snippet children({ disabled, title })}
					<Button
						size="sm"

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

	<ListEntityTable listKey="ClassGroupsList" rows={filteredClasses} highlightId={selectedId} onRowClick={onSelect} emptyLabel={$t('structure.emptyClasses')} columns={[{ key: 'name', label: $t('classGroups.name'), span: 4, required: true }, { key: 'count', label: $t('classGroups.studentCount'), span: 2 }, { key: 'attendance', label: $t('classGroups.attendanceMode'), span: 3 }]}>
		{#snippet cell(cls, column)}{#if column.key === 'name'}<div><p class="font-semibold">{cls.name}</p><p class="text-xs text-muted-foreground">{cls.id}</p></div>{:else if column.key === 'count'}<span class="tabular-nums">{cls.studentCount}</span>{:else}{$t(`classGroups.attendanceMode.${cls.attendanceMode}`)}{/if}{/snippet}
	</ListEntityTable>
</div>

<ClassGroupFormModal bind:open={createOpen.open} defaultGradeLevelId={classesPage.filters.values.gradeLevel} />
