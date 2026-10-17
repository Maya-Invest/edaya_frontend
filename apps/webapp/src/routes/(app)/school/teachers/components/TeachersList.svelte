<script lang="ts">
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
	import { Mail, Pencil, Phone, Plus, Trash2 } from '$lib/icons';
	import { downloadCsv, exportMatchingList, loadMatchingCollection } from '$lib/list/list-csv-export';
	import { ListSelectionState } from '$lib/list/list-selection-state.svelte';
	import { useInfiniteList } from '$lib/list/use-infinite-list.svelte';
	import { bindUrlModal, createUrlSyncedModals } from '$lib/modal/modal-state.svelte';
	import { appendModal } from '$lib/modal/modal-url';
	import { detailNavigationSearch } from '$lib/navigation/detail-navigation';
	import { currentRouteSurfaceHref, openDetailDrawer } from '$lib/navigation/route-surface-navigation';
	import { toast } from '$lib/toast.svelte';
	import { cn } from '$lib/utils';
	import {
		cycleTeacherListSort,
		teacherListUsesFullRoster,

	} from '../lib/teacher-list-filters';
	import { getTeachersPageState, SCHOOL_TEACHERS_PAGE_SIZE } from '../teachers-page.svelte';
	import TeacherCreateModal from './TeacherCreateModal.svelte';

	const {
		onSelect,
		selectedId,
	}: {
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

	const filtered = $derived(teachersPage.filterVisible(
		usesFullRoster
			? (teachersPage.fullRosterTeachers.length > 0
				? teachersPage.fullRosterTeachers
				: teachersPage.teachers)
			: teachersPage.teachers,
	));
	const windowed = useInfiniteList(() => filtered, SCHOOL_TEACHERS_PAGE_SIZE);

	const listTotal = $derived(
		usesFullRoster ? filtered.length : teachersPage.totalTeachers,
	);
	const listLoading = $derived(
		usesFullRoster ? teachersPage.loadingFullRoster : teachersPage.listLoading,
	);
	const listLoadingMore = $derived(usesFullRoster ? false : teachersPage.listLoadingMore);
	const listHasMore = $derived(
		usesFullRoster ? windowed.hasMore : teachersPage.teachers.length < teachersPage.totalTeachers,
	);
	const listVisible = $derived(
		usesFullRoster ? windowed.visible : filtered,
	);
	const listVisibleCount = $derived(listVisible.length);
	const selectionPool = $derived([...teachersPage.teachers, ...teachersPage.fullRosterTeachers]);

	const columns = $derived<ListEntityTableColumn[]>([
		{ key: 'name', label: $t('people.name'), span: 5, spanInSelectionMode: 4, sortable: true },
		{ key: 'assignments', label: $t('teacher.assignmentsColumn'), span: 3, sortable: true },
		{ key: 'status', label: $t('common.status'), span: 3, sortable: true },
		{ key: 'actions', label: '', span: 1, spanInSelectionMode: 1 },
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

	function exportSelected() {
		const selectedTeachers = selection.resolveSelected(selectionPool);
		if (selectedTeachers.length === 0) {
			return;
		}
		downloadCsv('teachers-selected.csv', [
			['name', 'email', 'phone', 'assignments', 'status'],
			...selectedTeachers.map(teacher => [
				teacher.name,
				teacher.email,
				teacher.phone,
				teachersPage.assignmentCount(teacher.id) ?? '',
				teacher.isActive ? 'active' : 'inactive',
			]),
		]);
		toast.success($t('list.exportedCount', { n: selectedTeachers.length }));
	}

	function exportMatching() {
		return exportMatchingList({
			filename: 'teachers.csv',
			headers: ['name', 'email', 'assignments', 'status'],
			loadAll: async () => {
				const teachers = await loadMatchingCollection({
					isComplete: () => teachersPage.fullRosterTeachers.length >= teachersPage.totalTeachers
						|| teachersPage.teachers.length >= teachersPage.totalTeachers,
					ensureComplete: () => teachersPage.loadFullRoster(),
					current: () => teachersPage.filterVisible(
						teachersPage.fullRosterTeachers.length > 0
							? teachersPage.fullRosterTeachers
							: teachersPage.teachers,
					),
				});
				return teachers.map(teacher => [
					teacher.name,
					teacher.email,
					teachersPage.assignmentCount(teacher.id) ?? '',
					teacher.isActive ? 'active' : 'inactive',
				]);
			},
		});
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
		eyebrow={$t('school.teachersDirectory')}
		title={$t('people.teachersCount', { n: listTotal })}
	>
		{#snippet search()}
			<ListSearchField
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
						class="rounded-full"
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
			onClear={() => selection.exitSelectionMode()}
		/>
	{/if}

	<ListEntityTable
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
		onRowClick={teacher => selection.handleRowClick(teacher, onSelect)}
		rowClass={teacher => !teacher.isActive && 'opacity-60'}
	>
		{#snippet row(teacher, ctx)}
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
			<div class="col-span-3 text-sm text-muted-foreground">
				{#if teachersPage.assignmentCount(teacher.id) === null}
					—
				{:else}
					{$t('teacher.assignmentCount', { n: teachersPage.assignmentCount(teacher.id) ?? 0 })}
				{/if}
			</div>
			<div class="col-span-3">
				{#if teacher.phone}
					<p class="flex items-center gap-1 text-xs text-muted-foreground">
						<Phone class="h-3 w-3" />
						{teacher.phone}
					</p>
				{:else}
					<span class="text-xs text-muted-foreground">
						{teacher.isActive ? $t('teacher.statusActive') : $t('teacher.statusInactive')}
					</span>
				{/if}
			</div>
			<div
				class="col-span-1 flex justify-end"
				role="presentation"
				onclick={event => event.stopPropagation()}
			>
				<PermissionGate permission="STAFF_MANAGE" mode="disable" tooltip={$t('teacher.permissionUpdate')}>
					{#snippet children({ disabled, title })}
						<RowActionMenu>
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
		{/snippet}
	</ListEntityTable>
</div>
