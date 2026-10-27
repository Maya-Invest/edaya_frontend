<script lang="ts">
	import { provideCollectionPresentation } from '$lib/list/collection-presentation.svelte';

	provideCollectionPresentation();
	import type { ListEntityTableColumn } from '$lib/list/list-entity-table-types';
	import type { Teacher } from '$lib/types/school';
	import type { TeacherSortColumn } from '../lib/teacher-list-filters';
	import { page } from '$app/stores';
	import PersonAvatar from '$lib/components/school/shared/PersonAvatar.svelte';
	import Button from '$lib/components/ui/button/button.svelte';
	import FilterSelect from '$lib/components/ui/filter-select.svelte';
	import ListEntityTable from '$lib/components/ui/ListEntityTable.svelte';
	import ListMoreMenu from '$lib/components/ui/ListMoreMenu.svelte';
	import ListPageHeader from '$lib/components/ui/ListPageHeader.svelte';
	import ListSearchField from '$lib/components/ui/ListSearchField.svelte';
	import ListSelectionBar from '$lib/components/ui/ListSelectionBar.svelte';
	import PermissionGate from '$lib/components/ui/PermissionGate.svelte';
	import RowActionMenu from '$lib/components/ui/RowActionMenu.svelte';
	import RowActionMenuItem from '$lib/components/ui/RowActionMenuItem.svelte';
	import { detailHref } from '$lib/detail-hrefs';
	import { t } from '$lib/i18n';
	import { Mail, Pencil, Plus, Trash2 } from '$lib/icons';
	import { loadMatchingCollection } from '$lib/list/list-csv-export';
	import { ListSelectionState } from '$lib/list/list-selection-state.svelte';
	import { useInfiniteList } from '$lib/list/use-infinite-list.svelte';
	import { bindUrlModal, createUrlSyncedModals } from '$lib/modal/modal-state.svelte';
	import { appendModal } from '$lib/modal/modal-url';
	import { detailNavigationSearch } from '$lib/navigation/detail-navigation';
	import { currentRouteSurfaceHref, openDetailDrawer } from '$lib/navigation/route-surface-navigation';
	import { DirectoryColumnsState } from '$lib/smart-components/directory-columns/directory-columns-state.svelte';
	import DirectoryColumnData from '$lib/smart-components/directory-columns/DirectoryColumnData.svelte';
	import { cn } from '$lib/utils';
	import { cycleTeacherListSort, teacherListUsesFullRoster } from '../lib/teacher-list-filters';
	import { getTeachersPageState, SCHOOL_TEACHERS_PAGE_SIZE } from '../teachers-page.svelte';
	import TeacherCreateModal from './TeacherCreateModal.svelte';

	const { onSelect, selectedId }: {
		onSelect?: (teacher: Teacher) => void;
		selectedId?: string;
	} = $props();
	const teachersPage = getTeachersPageState();
	const selection = new ListSelectionState<Teacher>();
	const modals = createUrlSyncedModals({ allowed: ['create'], getUrl: () => $page.url });
	$effect(() => {
		modals.hydrate();
	});
	const createOpen = bindUrlModal(modals, 'create');
	const usesFullRoster = $derived(teacherListUsesFullRoster(teachersPage.filters.values));
	const filtered = $derived(teachersPage.filterVisible(usesFullRoster
		? (teachersPage.fullRosterTeachers.length > 0
			? teachersPage.fullRosterTeachers
			: teachersPage.teachers)
		: teachersPage.teachers));
	const windowed = useInfiniteList(() => filtered, SCHOOL_TEACHERS_PAGE_SIZE);
	const listTotal = $derived(usesFullRoster ? filtered.length : teachersPage.totalTeachers);
	const listLoading = $derived(usesFullRoster ? teachersPage.loadingFullRoster : teachersPage.listLoading);
	const listLoadingMore = $derived(usesFullRoster ? false : teachersPage.listLoadingMore);
	const listHasMore = $derived(usesFullRoster ? windowed.hasMore : teachersPage.teachers.length < teachersPage.totalTeachers);
	const listVisible = $derived(usesFullRoster ? windowed.visible : filtered);
	const listVisibleCount = $derived(listVisible.length);
	const selectionPool = $derived([...teachersPage.teachers, ...teachersPage.fullRosterTeachers]);
	const directoryColumns = new DirectoryColumnsState('teacher');
	const columns = $derived<ListEntityTableColumn[]>([
		{ key: 'name', label: $t('people.name'), span: 5, spanInSelectionMode: 4, sortable: true },
		{ key: 'assignments', label: $t('teacher.assignmentsColumn'), span: 3, sortable: true },
		{ key: 'status', label: $t('common.status'), span: 3, sortable: true },
		{ key: 'actions', label: '', span: 1, spanInSelectionMode: 1 },
		...directoryColumns.columns(listVisible).filter(extra => !['name', 'assignments', 'status', 'actions'].includes(extra.key)),
	]);
	const statusFilterOptions = $derived([
		{ value: 'all', label: $t('filter.all') },
		{ value: 'active', label: $t('teacher.statusActive') },
		{ value: 'inactive', label: $t('teacher.statusInactive') },
	]);
	function loadMoreTeachers() {
		if (usesFullRoster) {
			windowed.loadMore();
			return;
		}
		void teachersPage.loadMore();
	}
	function applyStatusFilter(value: string) {
		teachersPage.filters.patch({ status: value });
		teachersPage.filters.syncNow();
	}
	function cycleSort(column: TeacherSortColumn) {
		const next = cycleTeacherListSort(teachersPage.filters.values, column);
		teachersPage.filters.patch(next);
		teachersPage.filters.syncNow();
	}
	function exportValue(row: Teacher, key: string) {
		return key === 'assignments' ? teachersPage.assignmentCount(row.id) ?? '' : key === 'status' ? (row.isActive ? $t('teacher.statusActive') : $t('teacher.statusInactive')) : undefined;
	}
	async function exportSelected() {
		const rows = selection.resolveSelected(selectionPool);
		if (!rows.length)
			return;
		await directoryColumns.exportCsv('teachers-selected.csv', rows, columns, exportValue);
	}
	async function exportMatching() {
		const matching = await loadMatchingCollection({
			isComplete: () => teachersPage.fullRosterTeachers.length >= teachersPage.totalTeachers
				|| teachersPage.teachers.length >= teachersPage.totalTeachers,
			ensureComplete: () => teachersPage.loadFullRoster(),
			current: () => teachersPage.filterVisible(teachersPage.fullRosterTeachers.length > 0
				? teachersPage.fullRosterTeachers
				: teachersPage.teachers),
		});
		await directoryColumns.exportCsv('teachers.csv', matching, columns, exportValue);
	}
	function teacherHref(teacher: Teacher, modal: 'edit-profile' | 'delete' | undefined) {
		const href = `${detailHref.schoolTeacherTab(teacher.id)}${detailNavigationSearch($page.url)}`;
		return modal ? appendModal(href, modal) : href;
	}
	function openTeacherAction(event: MouseEvent, teacher: Teacher, modal: 'edit-profile' | 'delete' | undefined) {
		event.stopPropagation();
		openDetailDrawer(teacherHref(teacher, modal), currentRouteSurfaceHref($page.url));
	}
</script>

<div class="animate-fade-in">
	<ListPageHeader
		filterCount={[teachersPage.filters.values.status].filter(value => value !== 'all').length}
		onResetFilters={() => teachersPage.filters.patchImmediate({ status: 'all' })}
		eyebrow={$t('school.teachersDirectory')}
		title={$t('people.teachersCount', { n: listTotal })}
	>
		{#snippet search()}
			<ListSearchField onCommit={() => teachersPage.filters.syncNow()}
				value={teachersPage.filters.values.q}
				oninput={event => teachersPage.filters.patch({ q: event.currentTarget.value })}
				placeholder={$t('common.search')}
			/>
		{/snippet}
		{#snippet filters()}
			<FilterSelect
				value={teachersPage.filters.values.status}
				class="h-9 w-40 rounded-full text-xs"
				options={statusFilterOptions}
				onchange={applyStatusFilter}
			/>
		{/snippet}
		{#snippet primary()}
			<PermissionGate
				permission="STAFF_MANAGE"
				mode="disable"
				tooltip={$t('teacher.permissionCreate')}
			>
				{#snippet children({ disabled, title })}
					<Button
						size="sm"

						{disabled}
						{title}
						onclick={() => modals.open('create')}
					>
						<Plus class="mr-1 h-4 w-4" />
						{$t('teacher.addTeacher')}
					</Button>
				{/snippet}
			</PermissionGate>
		{/snippet}
		{#snippet more()}
			<ListMoreMenu
				exportOnly
				onEnterSelectMode={selection.selectionMode ? undefined : () => selection.enterSelectionMode()}
				onExport={() => void exportMatching()}
			/>
		{/snippet}
	</ListPageHeader>

	<TeacherCreateModal bind:open={createOpen.open} />

	{#if selection.selectionMode}
		<ListSelectionBar
			selectedCount={selection.selectedIds.length}
			onExport={exportSelected}
			onClear={() => selection.clearSelection()} onExit={() => selection.exitSelectionMode()}
		/>
	{/if}

	<DirectoryColumnData owner={directoryColumns} rows={listVisible} />
	<ListEntityTable onVisibleColumnsChange={(keys) => {
		directoryColumns.keys = keys;
	}} listKey="TeachersList"
		{columns}
		rows={listVisible}
		highlightId={selectedId}
		sort={{ column: teachersPage.filters.values.sort, dir: teachersPage.filters.values.sortDir }}
		onSort={key => cycleSort(key as TeacherSortColumn)}
		selectionMode={selection.selectionMode}
		selectedIds={selection.selectedIds}
		onToggleSelected={(id, checked) => selection.toggleSelected(id, checked)}
		onToggleAllVisible={checked => selection.toggleVisible(listVisible, checked)}
		allVisibleSelected={selection.allVisibleSelected(listVisible)}
		loading={listLoading}
		loadingMore={listLoadingMore}
		hasMore={listHasMore}
		total={listTotal}
		visibleCount={listVisibleCount}
		onLoadMore={loadMoreTeachers}
		rowPaddingClass="py-4"
		onRowClick={onSelect}
		rowClass={teacher => !teacher.isActive && 'opacity-60'}
	>
		{#snippet cell(teacher, column, ctx)}

			{#if column.key === 'name'}
				<div class={cn('flex items-center gap-3', ctx.selectionMode ? 'col-span-4' : 'col-span-5')}>
					<PersonAvatar
						name={teacher.name}
						initials={teacher.initials}
						photoUrl={teacher.photoUrl}
						size="list"
					/>
					<div class="min-w-0">
						<p class="truncate text-sm font-medium">{teacher.name}</p>
						<p class="flex items-center gap-1 truncate text-xs text-muted-foreground">
							<Mail class="h-3 w-3" />
							{teacher.email || '—'}
						</p>
					</div>
				</div>
			{:else if column.key === 'assignments'}
				<div class="col-span-3 text-sm text-muted-foreground">
					{#if teachersPage.assignmentCount(teacher.id) === null}
						—
					{:else}
						{$t('teacher.assignmentCount', { n: teachersPage.assignmentCount(teacher.id) ?? 0 })}
					{/if}
				</div>
			{:else if column.key === 'status'}
				<span class="text-xs text-muted-foreground">{teacher.isActive ? $t('teacher.statusActive') : $t('teacher.statusInactive')}</span>
			{:else if column.key === 'actions'}
				<div
					class="col-span-1 flex justify-end"
					role="presentation"
					onclick={event => event.stopPropagation()}
				>
					<PermissionGate permission="STAFF_MANAGE" mode="disable" tooltip={$t('teacher.permissionUpdate')}>
						{#snippet children({ disabled, title })}
							<RowActionMenu label={`${$t('list.rowActions')} · ${teacher.name}`}>
								<RowActionMenuItem
									{disabled}
									{title}
									onclick={event => openTeacherAction(event, teacher, 'edit-profile')}
								>
									<Pencil class="h-4 w-4 text-muted-foreground" />
									{$t('common.edit')}
								</RowActionMenuItem>
								<RowActionMenuItem
									{disabled}
									{title}
									destructive
									onclick={event => openTeacherAction(event, teacher, 'delete')}
								>
									<Trash2 class="h-4 w-4" />
									{$t('common.delete')}
								</RowActionMenuItem>
							</RowActionMenu>
						{/snippet}
					</PermissionGate>
				</div>
			{:else}{#if directoryColumns.value(teacher, column.key).includes('; ')}<details><summary class="cursor-pointer truncate text-sm">{directoryColumns.value(teacher, column.key).split('; ')[0]}…</summary><p class="whitespace-pre-wrap break-words text-sm">{directoryColumns.value(teacher, column.key)}</p></details>{:else}<span class="whitespace-pre-wrap break-words text-sm">{directoryColumns.value(teacher, column.key)}</span>{/if}{/if}
		{/snippet}
	</ListEntityTable>
</div>
