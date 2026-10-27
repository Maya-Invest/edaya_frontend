<script lang="ts">
	import { provideCollectionPresentation } from '$lib/list/collection-presentation.svelte';

	provideCollectionPresentation();
	import type { ListEntityTableColumn } from '$lib/list/list-entity-table-types';
	import type { ListCardColumns, ListView } from '$lib/list/list-view-url';
	import type { Student } from '$lib/types/school';
	import type { StudentSortColumn } from '../lib/student-list-filters';
	import { afterNavigate } from '$app/navigation';
	import { page } from '$app/stores';
	import PersonAvatar from '$lib/components/school/shared/PersonAvatar.svelte';
	import Button from '$lib/components/ui/button/button.svelte';
	import FilterSelect from '$lib/components/ui/filter-select.svelte';
	import FilterPanel from '$lib/components/ui/FilterPanel.svelte';
	import Label from '$lib/components/ui/label/label.svelte';
	import ListEntityCards from '$lib/components/ui/ListEntityCards.svelte';
	import ListEntityTable from '$lib/components/ui/ListEntityTable.svelte';
	import ListMoreMenu from '$lib/components/ui/ListMoreMenu.svelte';
	import ListPageHeader from '$lib/components/ui/ListPageHeader.svelte';
	import ListSearchField from '$lib/components/ui/ListSearchField.svelte';
	import PermissionGate from '$lib/components/ui/PermissionGate.svelte';
	import RowActionMenu from '$lib/components/ui/RowActionMenu.svelte';
	import RowActionMenuItem from '$lib/components/ui/RowActionMenuItem.svelte';
	import { detailHref } from '$lib/detail-hrefs';
	import { t } from '$lib/i18n';
	import { Eye, GraduationCap, Pencil, Plus } from '$lib/icons';
	import { loadCardColumnsPreference, saveCardColumnsPreference } from '$lib/list/list-card-columns-preference';
	import { loadMatchingCollection } from '$lib/list/list-csv-export';
	import { isListCardColumns, readListCardColumns, readListView, writeListCardColumns, writeListView } from '$lib/list/list-view-url';
	import { useInfiniteList } from '$lib/list/use-infinite-list.svelte';
	import { appendModal, MODAL_QUERY_KEY } from '$lib/modal/modal-url';
	import { appGoto } from '$lib/navigation/app-navigation';
	import { detailNavigationSearch } from '$lib/navigation/detail-navigation';
	import { currentRouteSurfaceHref, openDetailDrawer } from '$lib/navigation/route-surface-navigation';
	import { DirectoryColumnsState } from '$lib/smart-components/directory-columns/directory-columns-state.svelte';
	import DirectoryColumnData from '$lib/smart-components/directory-columns/DirectoryColumnData.svelte';
	import StudentSubjectEnrollmentActions from '$lib/smart-components/subject-enrollment/StudentSubjectEnrollmentActions.svelte';
	import { cn } from '$lib/utils';
	import { studentListUsesFullRoster, cycleStudentListSort } from '../lib/student-list-filters';
	import { getStudentsPageState, SCHOOL_STUDENTS_PAGE_SIZE } from '../students-page.svelte';

	const { onSelect, selectedId, onCreate }: {
		onSelect?: (student: Student) => void;
		selectedId?: string;
		onCreate: () => void;
	} = $props();
	const studentsPage = getStudentsPageState();
	const classes = $derived(studentsPage.classes);
	const hierarchy = $derived(studentsPage.hierarchy);
	const selection = studentsPage.selection;
	const view = $derived(readListView($page.url));
	const storedCardColumns = loadCardColumnsPreference('school-students-card-columns', 3);
	const defaultCardColumns: ListCardColumns = isListCardColumns(storedCardColumns)
		? storedCardColumns
		: 3;
	const cardColumns = $derived(readListCardColumns($page.url, defaultCardColumns));
	function setCardColumns(next: number) {
		if (!isListCardColumns(next)) {
			return;
		}
		saveCardColumnsPreference('school-students-card-columns', next);
		void appGoto(writeListCardColumns($page.url, next), {
			replaceState: true,
			keepFocus: true,
			noScroll: true,
		});
	}
	function setView(next: ListView) {
		void appGoto(writeListView($page.url, next), {
			replaceState: true,
			keepFocus: true,
			noScroll: true,
		});
	}
	afterNavigate(() => {
		if ($page.url.searchParams.has(MODAL_QUERY_KEY)) {
			return;
		}
		const viewHref = writeListView($page.url, view);
		const canonicalHref = writeListCardColumns(new URL(viewHref, $page.url), cardColumns);
		if (canonicalHref !== `${$page.url.pathname}${$page.url.search}`) {
			void appGoto(canonicalHref, {
				replaceState: true,
				keepFocus: true,
				noScroll: true,
			});
		}
	});
	const usesFullRoster = $derived(studentListUsesFullRoster(studentsPage.filters.values));
	const filtered = $derived(studentsPage.filterVisible(usesFullRoster
		? (studentsPage.fullRosterStudents.length > 0
			? studentsPage.fullRosterStudents
			: studentsPage.students)
		: studentsPage.students));
	const windowed = useInfiniteList(() => filtered, SCHOOL_STUDENTS_PAGE_SIZE);
	const listTotal = $derived(usesFullRoster ? filtered.length : studentsPage.totalStudents);
	const listLoading = $derived(usesFullRoster ? studentsPage.loadingFullRoster : studentsPage.listLoading);
	const listLoadingMore = $derived(usesFullRoster ? false : studentsPage.listLoadingMore);
	const listHasMore = $derived(usesFullRoster ? windowed.hasMore : studentsPage.students.length < studentsPage.totalStudents);
	const listVisible = $derived(usesFullRoster ? windowed.visible : filtered);
	const listVisibleCount = $derived(listVisible.length);
	const selectionPool = $derived([...studentsPage.students, ...studentsPage.fullRosterStudents]);
	const directoryColumns = new DirectoryColumnsState('student');
	const columns = $derived<ListEntityTableColumn[]>([
		{
			key: 'name',
			label: $t('students.student'),
			span: 3,
			sortable: true,
			card: { zone: 'header', showLabel: false },
		},
		{
			key: 'class',
			label: $t('students.class'),
			span: 2,
			sortable: true,
			card: { zone: 'body', showLabel: true },
		},
		{
			key: 'average',
			label: $t('students.average'),
			span: 2,
			sortable: true,
			card: { zone: 'footer', showLabel: true },
		},
		{
			key: 'attendance',
			label: $t('students.attendance'),
			span: 2,
			sortable: true,
			card: { zone: 'footer', defaultVisible: false, showLabel: true },
		},
		{
			key: 'status',
			label: $t('students.status'),
			span: 2,
			spanInSelectionMode: 1,
			sortable: true,
			card: { zone: 'footer', showLabel: true },
		},
		{ key: 'actions', label: '', span: 1, required: true },
		...directoryColumns.columns(listVisible).filter(extra => !['name', 'class', 'average', 'attendance', 'status', 'actions'].includes(extra.key)),
	]);
	const statusStyle: Record<Student['status'], string> = {
		graduated: 'bg-secondary text-foreground/70',
		active: 'bg-secondary text-foreground/70',
		inactive: 'bg-secondary text-muted-foreground',
		archived: 'bg-secondary/60 text-muted-foreground',
	};
	const badgeStyle: Record<NonNullable<Student['academicBadge']>, string> = {
		honor: 'bg-secondary text-foreground/80',
		warning: 'bg-highlight-soft text-highlight',
	};
	const statusKeys = ['all', 'active', 'inactive', 'graduated', 'archived'] as const;
	const classFilterGroups = $derived(hierarchy.map(group => ({
		label: group.level,
		options: group.classes.map(classGroup => ({
			value: classGroup.id,
			label: `${classGroup.name} · ${classGroup.studentCount}`,
		})),
	})));
	function statusLabel(key: (typeof statusKeys)[number]) {
		return key === 'all' ? $t('filter.all') : $t(`studentStatus.${key}`);
	}
	const statusFilterActive = $derived(studentsPage.filters.values.status !== 'all' ? 1 : 0);
	const photoReviewFilterActive = $derived(studentsPage.filters.values.photoReview !== 'all' ? 1 : 0);
	const photoReviewFilterOptions = $derived([
		{ value: 'all', label: $t('students.photoReview.all') },
		{ value: 'pending', label: $t('students.photoReview.pending') },
	]);
	const statusFilterOptions = $derived(statusKeys.map(key => ({
		value: key,
		label: statusLabel(key),
	})));
	function attendanceLabel(attendance: number | null) {
		return attendance == null ? '—' : `${attendance}%`;
	}
	function loadMoreStudents() {
		if (usesFullRoster) {
			windowed.loadMore();
			return;
		}
		void studentsPage.loadMore();
	}
	function applyFacetFilter(field: 'class' | 'status' | 'photoReview', value: string) {
		studentsPage.filters.patch({ [field]: value });
		studentsPage.filters.syncNow();
		void studentsPage.refreshList();
	}
	function cycleSort(column: StudentSortColumn) {
		const next = cycleStudentListSort(studentsPage.filters.values, column);
		studentsPage.filters.patch(next);
		studentsPage.filters.syncNow();
	}
	function detailHrefFor(student: Student, modal: 'edit-profile' | 'change-class' | undefined = undefined) {
		const href = `${detailHref.schoolStudent(student.id)}${detailNavigationSearch($page.url)}`;
		return modal ? appendModal(href, modal) : href;
	}
	function openStudentAction(event: MouseEvent, student: Student, modal: 'edit-profile' | 'change-class' | undefined = undefined) {
		event.stopPropagation();
		openDetailDrawer(detailHrefFor(student, modal), currentRouteSurfaceHref($page.url));
	}
	function exportValue(row: Student, key: string) {
		return key === 'class' ? classes.find(entry => entry.id === row.classId)?.name ?? row.classId : key === 'attendance' ? attendanceLabel(row.attendance) : key === 'average' ? row.average.toFixed(2) : undefined;
	}
	async function exportSelected() {
		const rows = selection.resolveSelected(selectionPool);
		if (!rows.length)
			return;
		await directoryColumns.exportCsv('students-selected.csv', rows, columns, exportValue);
	}
	async function exportMatching() {
		const matching = await loadMatchingCollection({
			isComplete: () => studentsPage.fullRosterStudents.length >= studentsPage.totalStudents
				|| studentsPage.students.length >= studentsPage.totalStudents,
			ensureComplete: () => studentsPage.loadFullRoster(),
			current: () => studentsPage.filterVisible(studentsPage.fullRosterStudents.length > 0
				? studentsPage.fullRosterStudents
				: studentsPage.students),
		});
		await directoryColumns.exportCsv('students.csv', matching, columns, exportValue);
	}
</script>

<div class="animate-fade-in">
	<ListPageHeader
		filterCount={[studentsPage.filters.values.class, studentsPage.filters.values.status, studentsPage.filters.values.photoReview].filter(value => value !== 'all').length}
		onResetFilters={() => studentsPage.filters.patchImmediate({ class: 'all', status: 'all', photoReview: 'all' })}
		eyebrow={$t('students.schoolRoster')}
		title={$t('students.countLabel', { n: listTotal })}
	>
		{#snippet search()}
			<ListSearchField onCommit={() => studentsPage.filters.syncNow()}
				value={studentsPage.filters.values.q}
				oninput={event => studentsPage.filters.patch({ q: event.currentTarget.value })}
				placeholder={$t('common.searchStudent')}
			/>
		{/snippet}
		{#snippet filters()}
			<FilterSelect
				value={studentsPage.filters.values.class}
				class="h-9 w-48 rounded-full text-xs"
				aria-label={$t('common.allClasses')}
				options={[{ value: 'all', label: $t('common.allClasses') }]}
				groups={classFilterGroups}
				onchange={value => applyFacetFilter('class', value)}
			/>
			<FilterPanel
				activeCount={statusFilterActive + photoReviewFilterActive}
				class="border-input bg-background"
			>
				<div class="space-y-2">
					<Label for="student-status-filter">{$t('students.statusFilter')}</Label>
					<FilterSelect
						id="student-status-filter"
						aria-label={$t('students.statusFilter')}
						value={studentsPage.filters.values.status}
						class="h-9 w-full rounded-md text-xs"
						options={statusFilterOptions}
						onchange={value => applyFacetFilter('status', value)}
					/>
				</div>
				<div class="space-y-2">
					<Label for="student-photo-review-filter">{$t('students.photoReviewFilter')}</Label>
					<FilterSelect
						id="student-photo-review-filter"
						aria-label={$t('students.photoReviewFilter')}
						value={studentsPage.filters.values.photoReview}
						class="h-9 w-full rounded-md text-xs"
						options={photoReviewFilterOptions}
						onchange={value => applyFacetFilter('photoReview', value)}
					/>
				</div>
			</FilterPanel>
		{/snippet}
		{#snippet more()}
			<ListMoreMenu
				{view}
				onEnterSelectMode={selection.selectionMode ? undefined : () => selection.enterSelectionMode()}
				onViewChange={setView}
				onExport={() => void exportMatching()}
			/>
		{/snippet}
		{#snippet primary()}
			<PermissionGate
				permission="STUDENT_CREATE"
				mode="disable"
				tooltip={$t('student.permissionCreate')}
			>
				{#snippet children({ disabled, title })}
					<Button
						size="sm"

						{disabled}
						{title}
						onclick={onCreate}
					>
						<Plus class="mr-1 h-4 w-4" />
						{$t('students.newStudent')}
					</Button>
				{/snippet}
			</PermissionGate>
		{/snippet}
	</ListPageHeader>

	<StudentSubjectEnrollmentActions {selection} students={selectionPool} onExport={exportSelected} onSaved={() => studentsPage.invalidateIfStale()} />

	{#if view === 'table'}
		<DirectoryColumnData owner={directoryColumns} rows={listVisible} />
		<ListEntityTable onVisibleColumnsChange={(keys) => {
			directoryColumns.keys = keys;
		}} listKey="StudentsList"
			{columns}
			rows={listVisible}
			highlightId={selectedId}
			sort={{ column: studentsPage.filters.values.sort, dir: studentsPage.filters.values.sortDir }}
			onSort={key => cycleSort(key as StudentSortColumn)}
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
			onLoadMore={loadMoreStudents}
			onRowClick={onSelect}
		>

			{#snippet cell(student, column, ctx)}
				{@const classGroup = classes.find(entry => entry.id === student.classId)}
				{#if column.key === 'name'}
					<div class="col-span-3 flex items-center gap-3">
						<PersonAvatar
							name={student.name}
							initials={student.initials}
							photoUrl={student.photoUrl}
							size="list"
							class="h-9 w-9 text-xs"
						/>
						<div class="min-w-0">
							<p class="truncate text-sm font-medium">{student.name}</p>
							<p class="truncate text-xs text-muted-foreground">{student.email || '—'}</p>
						</div>
					</div>
				{:else if column.key === 'class'}
					<div class="col-span-2 text-sm text-foreground/80">{classGroup?.name}</div>
				{:else if column.key === 'average'}
					<div class="col-span-2 font-sans text-base font-semibold tabular-nums">
						{student.average.toFixed(2)}
					</div>
				{:else if column.key === 'attendance'}
					<div class="col-span-2">
						{#if student.attendance == null}
							<p class="font-sans tabular-nums text-[10px] text-muted-foreground">—</p>
						{:else}
							<div class="h-1.5 w-full overflow-hidden rounded-full bg-secondary">
								<div class="h-full rounded-full bg-accent" style:width="{student.attendance}%"></div>
							</div>
							<p class="mt-1 font-sans tabular-nums text-[10px] text-muted-foreground">{student.attendance}%</p>
						{/if}
					</div>
				{:else if column.key === 'status'}
					<div class={cn(ctx.selectionMode ? 'col-span-1' : 'col-span-2', 'flex flex-wrap items-center gap-1')}>
						<span
							class={cn(
								'rounded-full px-2 py-0.5 text-[10px] font-medium',
								statusStyle[student.status],
							)}
						>
							{$t(`studentStatus.${student.status}`)}
						</span>
						{#if student.academicBadge}
							<span
								class={cn(
									'rounded-full px-2 py-0.5 text-[10px] font-medium',
									badgeStyle[student.academicBadge],
								)}
							>
								{$t(`studentStatus.${student.academicBadge}`)}
							</span>
						{/if}
					</div>
				{:else if column.key === 'actions'}
					<div class="col-span-1 flex justify-end" role="presentation" onclick={event => event.stopPropagation()}>
						<RowActionMenu label={`${$t('list.rowActions')} · ${student.name}`}>
							<RowActionMenuItem onclick={event => openStudentAction(event, student)}>
								<Eye class="h-4 w-4 text-muted-foreground" />
								{$t('common.open')}
							</RowActionMenuItem>
							<RowActionMenuItem onclick={event => openStudentAction(event, student, 'edit-profile')}>
								<Pencil class="h-4 w-4 text-muted-foreground" />
								{$t('common.edit')}
							</RowActionMenuItem>
							<RowActionMenuItem onclick={event => openStudentAction(event, student, 'change-class')}>
								<GraduationCap class="h-4 w-4 text-muted-foreground" />
								{$t('student.changeClass')}
							</RowActionMenuItem>
						</RowActionMenu>
					</div>
				{:else}{#if directoryColumns.value(student, column.key).includes('; ')}<details><summary class="cursor-pointer truncate text-sm">{directoryColumns.value(student, column.key).split('; ')[0]}…</summary><p class="whitespace-pre-wrap break-words text-sm">{directoryColumns.value(student, column.key)}</p></details>{:else}<span class="whitespace-pre-wrap break-words text-sm">{directoryColumns.value(student, column.key)}</span>{/if}{/if}
			{/snippet}
		</ListEntityTable>
	{:else}
		<ListEntityCards
			{columns}
			rows={listVisible}
			highlightId={selectedId}
			sort={{ column: studentsPage.filters.values.sort, dir: studentsPage.filters.values.sortDir }}
			onSort={key => cycleSort(key as StudentSortColumn)}
			columnsPerRow={cardColumns}
			onColumnsPerRowChange={setCardColumns}
			selectionMode={selection.selectionMode}
			selectedIds={selection.selectedIds}
			onToggleSelected={(id, checked) => selection.toggleSelected(id, checked)}
			loading={listLoading}
			loadingMore={listLoadingMore}
			hasMore={listHasMore}
			total={listTotal}
			visibleCount={listVisibleCount}
			onLoadMore={loadMoreStudents}
			onRowClick={onSelect}
		>
			{#snippet field(student, columnKey)}
				{@const classGroup = classes.find(entry => entry.id === student.classId)}
				{#if columnKey === 'name'}
					<div class="flex items-center gap-3">
						<PersonAvatar
							name={student.name}
							initials={student.initials}
							photoUrl={student.photoUrl}
							size="list"
						/>
						<div class="min-w-0">
							<p class="truncate font-medium">{student.name}</p>
						</div>
					</div>
				{:else if columnKey === 'class'}
					<p class="truncate text-sm text-muted-foreground">{classGroup?.name}</p>
				{:else if columnKey === 'average'}
					<span class="font-sans font-semibold tabular-nums text-sm">
						{student.average.toFixed(2)}
					</span>
				{:else if columnKey === 'attendance'}
					{#if student.attendance == null}
						<p class="font-sans tabular-nums text-[10px] text-muted-foreground">—</p>
					{:else}
						<div class="min-w-[7rem]">
							<div class="h-1.5 w-full overflow-hidden rounded-full bg-secondary">
								<div class="h-full rounded-full bg-accent" style:width="{student.attendance}%"></div>
							</div>
							<p class="mt-1 font-sans tabular-nums text-[10px] text-muted-foreground">{student.attendance}%</p>
						</div>
					{/if}
				{:else if columnKey === 'status'}
					<div class="flex flex-wrap items-center gap-1">
						<span
							class={cn(
								'rounded-full px-2 py-0.5 text-[10px] font-medium',
								statusStyle[student.status],
							)}
						>
							{$t(`studentStatus.${student.status}`)}
						</span>
						{#if student.academicBadge}
							<span
								class={cn(
									'rounded-full px-2 py-0.5 text-[10px] font-medium',
									badgeStyle[student.academicBadge],
								)}
							>
								{$t(`studentStatus.${student.academicBadge}`)}
							</span>
						{/if}
					</div>
				{/if}
			{/snippet}
			{#snippet actions(student)}
				<RowActionMenu label={`${$t('list.rowActions')} · ${student.name}`}>
					<RowActionMenuItem onclick={event => openStudentAction(event, student)}>
						<Eye class="h-4 w-4 text-muted-foreground" />
						{$t('common.open')}
					</RowActionMenuItem>
					<RowActionMenuItem onclick={event => openStudentAction(event, student, 'edit-profile')}>
						<Pencil class="h-4 w-4 text-muted-foreground" />
						{$t('common.edit')}
					</RowActionMenuItem>
					<RowActionMenuItem onclick={event => openStudentAction(event, student, 'change-class')}>
						<GraduationCap class="h-4 w-4 text-muted-foreground" />
						{$t('student.changeClass')}
					</RowActionMenuItem>
				</RowActionMenu>
			{/snippet}
		</ListEntityCards>
	{/if}
</div>
