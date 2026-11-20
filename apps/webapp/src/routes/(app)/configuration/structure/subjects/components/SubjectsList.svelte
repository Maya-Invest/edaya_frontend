<script lang="ts">
	import type { Subject } from '$lib/types/school';
	import { page } from '$app/stores';
	import FilterSelect from '$lib/components/ui/filter-select.svelte';
	import FilterPanel from '$lib/components/ui/FilterPanel.svelte';
	import ListPageHeader from '$lib/components/ui/ListPageHeader.svelte';
	import ListSearchField from '$lib/components/ui/ListSearchField.svelte';
	import RowActionMenu from '$lib/components/ui/RowActionMenu.svelte';
	import RowActionMenuItem from '$lib/components/ui/RowActionMenuItem.svelte';
	import { t } from '$lib/i18n';
	import { ListFiltersState } from '$lib/list/list-filters-state.svelte';
	import { readConfigSubjectListFilters, writeConfigSubjectListFilters } from '$lib/list/list-url-filters';
	import { bindUrlModal, createUrlSyncedModals } from '$lib/modal/modal-state.svelte';
	import { appGoto } from '$lib/navigation/app-navigation';
	import { hasPermission, hasAnyPermission } from '$lib/permissions';
	import { groupModuleSubjects } from '../lib/module-groups';
	import { getSubjectsPageState } from '../subjects-page.svelte';
	import ReportModuleForm from './ReportModuleForm.svelte';
	import ReportSettingsForm from './ReportSettingsForm.svelte';
	import SubjectCatalogCreateModal from './SubjectCatalogCreateModal.svelte';
	import SubjectCatalogRow from './SubjectCatalogRow.svelte';

	const { onSelect, onEdit, selectedId }: { onSelect?: (subject: Subject) => void; onEdit?: (subject: Subject) => void; selectedId?: string } = $props();
	const state = getSubjectsPageState();
	const configuration = $derived(state.slice?.configuration);
	const levelId = $derived(configuration?.gradeLevelId ?? '');
	const canConfigure = $derived(hasPermission('REPORT_CARD_CONFIGURE', { gradeLevelId: levelId }));
	const canManage = $derived(hasPermission('ACADEMIC_PROGRAM_MANAGE', { gradeLevelId: levelId }));
	const canInspect = $derived(hasAnyPermission(['ACADEMIC_PROGRAM_READ', 'ACADEMIC_PROGRAM_MANAGE'], { gradeLevelId: levelId }));
	const listFilters = new ListFiltersState<{ q: string; gradeLevel: string }>({ getUrl: () => $page.url, write: writeConfigSubjectListFilters, goto: href => appGoto(href, { replaceState: true, keepFocus: true, noScroll: true }) }, () => readConfigSubjectListFilters($page.url));
	const category = $derived($page.url.searchParams.get('category') ?? 'all');
	const categories = $derived([...new Map(state.subjects().map(subject => [subject.categoryId, subject.category])).entries()].map(([value, label]) => ({ value, label })));
	function setCategory(value: string) {
		const url = new URL($page.url);
		if (value === 'all')
			url.searchParams.delete('category');
		else url.searchParams.set('category', value);
		void appGoto(`${url.pathname}${url.search}`, { replaceState: true, keepFocus: true, noScroll: true });
	}
	const groups = $derived(groupModuleSubjects(state.subjects(), configuration?.modules ?? [], subject => (category === 'all' || subject.categoryId === category) && `${subject.name} ${subject.category} ${subject.description}`.toLowerCase().includes(listFilters.values.q.trim().toLowerCase()), !!listFilters.values.q.trim() || category !== 'all'));
	const modals = createUrlSyncedModals({ allowed: ['create-subject', 'module-create', 'module-edit', 'module-members', 'module-delete', 'report-settings'], getUrl: () => $page.url });
	const reportSettings = bindUrlModal(modals, 'report-settings');
	const createSubject = bindUrlModal(modals, 'create-subject');
	const createModule = bindUrlModal(modals, 'module-create');
	const editModule = bindUrlModal(modals, 'module-edit');
	const membersModule = bindUrlModal(modals, 'module-members');
	const deleteModule = bindUrlModal(modals, 'module-delete');
	const selectedModule = $derived(configuration?.modules.find(module => module.id === modals.target));
	$effect(() => {
		modals.hydrate();
		listFilters.hydrate(readConfigSubjectListFilters($page.url));
	});
</script>
<ListPageHeader level="section" title={$t('subjects.count', { n: groups.reduce((sum, group) => sum + group.items.length, 0) })}>
	{#snippet search()}<ListSearchField value={listFilters.values.q} oninput={event => listFilters.setField('q', event.currentTarget.value)} />{/snippet}
	{#snippet filters()}<FilterPanel activeCount={category === 'all' ? 0 : 1}><FilterSelect aria-label={$t('subjects.category')} value={category} options={[{ value: 'all', label: $t('filter.all') }, ...categories]} onchange={setCategory} /></FilterPanel>{/snippet}
	{#snippet more()}{#if canManage || canConfigure}<RowActionMenu label={$t('list.rowActions')}>
		{#if canManage}<RowActionMenuItem onclick={() => modals.open('create-subject')}>{$t('subjects.createTitle')}</RowActionMenuItem>{/if}
		{#if canConfigure}<RowActionMenuItem onclick={() => modals.open('module-create')}>{$t('modules.add')}</RowActionMenuItem><RowActionMenuItem onclick={() => modals.open('report-settings')}>{$t('modules.settings')}</RowActionMenuItem>{/if}
	</RowActionMenu>{/if}{/snippet}
</ListPageHeader>
{#if canManage}<SubjectCatalogCreateModal bind:open={createSubject.open} defaultGradeLevelId={levelId} defaultModuleId={modals.target ?? undefined} />{/if}
{#if canConfigure}
	<ReportSettingsForm bind:open={reportSettings.open} />
	<ReportModuleForm bind:open={createModule.open} />
	{#if selectedModule}
		<ReportModuleForm bind:open={editModule.open} module={selectedModule} />
		<ReportModuleForm bind:open={membersModule.open} module={selectedModule} action="assign" />
		<ReportModuleForm bind:open={deleteModule.open} module={selectedModule} action="delete" />
	{/if}
{/if}
<div class="space-y-6">
	{#each groups as group (group.id)}
		<section data-module-id={group.module?.id}>
			<div class="mb-2 flex items-start justify-between gap-4">
				<div><h3 class="font-display text-lg font-semibold">{group.module?.name ?? $t('modules.ungrouped')}</h3>
					{#if group.module}<p class="text-sm text-muted-foreground">{$t(group.module.weightingMode === 'explicit' ? 'modules.explicit' : 'modules.sum')}: {group.module.weightingMode === 'explicit' ? group.module.explicitWeight : group.missingCoefficients ? $t('modules.notConfigured') : group.coefficientSum}</p>{/if}
				</div>
				{#if group.module && (canConfigure || canManage)}<RowActionMenu label={`${$t('list.rowActions')} · ${group.module.name}`}>
					{#if canConfigure}<RowActionMenuItem onclick={() => modals.open('module-edit', { target: group.id })}>{$t('common.edit')}</RowActionMenuItem><RowActionMenuItem onclick={() => modals.open('module-members', { target: group.id })}>{$t('modules.members')}</RowActionMenuItem>{/if}
					{#if canManage && canConfigure}<RowActionMenuItem onclick={() => modals.open('create-subject', { target: group.id })}>{$t('subjects.createTitle')}</RowActionMenuItem>{/if}
					{#if canConfigure}<RowActionMenuItem destructive onclick={() => modals.open('module-delete', { target: group.id })}>{$t('modules.delete')}</RowActionMenuItem>{/if}
				</RowActionMenu>{/if}
			</div>
			<div class="overflow-hidden rounded-collection border border-border bg-card">
				{#each group.items as subject (subject.id)}<SubjectCatalogRow {subject} active={selectedId === subject.id} onSelect={canInspect ? () => onSelect?.(subject) : undefined} onEdit={canManage ? () => onEdit?.(subject) : undefined} />
				{:else}<p class="p-4 text-sm text-muted-foreground">{$t(group.module ? 'modules.empty' : 'subjects.noneForGradeLevel')}</p>{/each}
			</div>
		</section>
	{:else}<p class="py-8 text-sm text-muted-foreground">{$t('dataState.emptyDescription')}</p>{/each}
</div>
