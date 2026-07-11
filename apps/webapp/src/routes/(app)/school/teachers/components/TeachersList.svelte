<script lang="ts">
	import type { ListEntityTableColumn } from '$lib/list/list-entity-table-types';
	import type { Teacher } from '$lib/types/school';
	import type { TeacherSortColumn } from '../lib/teacher-list-filters';
	import { page } from '$app/stores';
	import PersonAvatar from '$lib/components/school/shared/PersonAvatar.svelte';
	import Button from '$lib/components/ui/button/button.svelte';
	import ListEntityTable from '$lib/components/ui/ListEntityTable.svelte';
	import ListMoreMenu from '$lib/components/ui/ListMoreMenu.svelte';
	import ListPageHeader from '$lib/components/ui/ListPageHeader.svelte';
	import ListSearchField from '$lib/components/ui/ListSearchField.svelte';
	import ListSelectionBar from '$lib/components/ui/ListSelectionBar.svelte';
	import PermissionGate from '$lib/components/ui/PermissionGate.svelte';
	import { t } from '$lib/i18n';
	import { Mail, Phone, Plus } from '$lib/icons';
	import { downloadCsv } from '$lib/list/list-csv-export';
	import { ListSelectionState } from '$lib/list/list-selection-state.svelte';
	import { useInfiniteList } from '$lib/list/use-infinite-list.svelte';
	import { bindUrlModal, createUrlSyncedModals } from '$lib/modal/modal-state.svelte';
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
		{ key: 'status', label: $t('common.status'), span: 4, sortable: true },
	]);

	function loadMoreTeachers() {
		if (usesFullRoster) {
			windowed.loadMore();
			return;
		}
		void teachersPage.loadMore();
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
				teachersPage.assignmentCount(teacher.id),
				teacher.isActive ? 'active' : 'inactive',
			]),
		]);
		toast.success($t('list.exportedCount', { n: selectedTeachers.length }));
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
		{#snippet primary()}
			<PermissionGate
				permission="STAFF_CREATE"
				mode="disable"
				tooltip={$t('teacher.permissionCreate')}
			>
				{#snippet children({ disabled, title })}
					<Button
						size="sm"
						class="rounded-full"
						{disabled}
						{title}
						onclick={() => (createOpen.open = true)}
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
				{$t('teacher.assignmentCount', { n: teachersPage.assignmentCount(teacher.id) })}
			</div>
			<div class="col-span-4">
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
		{/snippet}
	</ListEntityTable>
</div>
