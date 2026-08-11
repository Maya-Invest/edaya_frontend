<script lang="ts">
	import type { ListEntityTableColumn } from '$lib/list/list-entity-table-types';
	import type { Student } from '$lib/types/school';
	import type { StudentSortColumn } from '../lib/student-list-filters';
	import { page } from '$app/stores';
	import PersonAvatar from '$lib/components/school/shared/PersonAvatar.svelte';
	import Button from '$lib/components/ui/button/button.svelte';
	import FilterSelect from '$lib/components/ui/filter-select.svelte';
	import FilterPanel from '$lib/components/ui/FilterPanel.svelte';
	import ListEntityCards from '$lib/components/ui/ListEntityCards.svelte';
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
	import { Eye, GraduationCap, Pencil, Plus } from '$lib/icons';
	import { loadCardColumnsPreference, saveCardColumnsPreference } from '$lib/list/list-card-columns-preference';
	import { downloadCsv } from '$lib/list/list-csv-export';
	import { ListSelectionState } from '$lib/list/list-selection-state.svelte';
	import { useInfiniteList } from '$lib/list/use-infinite-list.svelte';
	import { bindUrlModal, closeUrlModal, createUrlSyncedModals } from '$lib/modal/modal-state.svelte';
	import { appendModal } from '$lib/modal/modal-url';
	import { appGoto } from '$lib/navigation/app-navigation';
	import { detailNavigationSearch } from '$lib/navigation/detail-navigation';
	import { toast } from '$lib/toast.svelte';
	import { cn } from '$lib/utils';
	import { studentListUsesFullRoster, cycleStudentListSort } from '../lib/student-list-filters';
	import {
		getStudentsPageState,
		SCHOOL_STUDENTS_PAGE_SIZE,
	} from '../students-page.svelte';
	import StudentCreateModal from './StudentCreateModal.svelte';

	const {
		onSelect,
		selectedId,
	}: {
		onSelect?: (student: Student) => void;
		selectedId?: string;
	} = $props();

	const studentsPage = getStudentsPageState();
	const classes = $derived(studentsPage.classes);
	const hierarchy = $derived(studentsPage.hierarchy);
	const selection = new ListSelectionState<Student>();

	let view = $state<'table' | 'cards'>('table');
	let cardColumns = $state(loadCardColumnsPreference('school-students-card-columns', 3));

	function setCardColumns(next: number) {
		cardColumns = next;
		saveCardColumnsPreference('school-students-card-columns', next);
	}

	const modals = createUrlSyncedModals({ allowed: ['create'], getUrl: () => $page.url });
	$effect(() => {
		modals.hydrate();
	});
	const createOpen = bindUrlModal(modals, 'create');

	const usesFullRoster = $derived(studentListUsesFullRoster(studentsPage.filters.values));

	const filtered = $derived(studentsPage.filterVisible(
		usesFullRoster
			? (studentsPage.fullRosterStudents.length > 0
				? studentsPage.fullRosterStudents
				: studentsPage.students)
			: studentsPage.students,
	));
	const windowed = useInfiniteList(() => filtered, SCHOOL_STUDENTS_PAGE_SIZE);

	const listTotal = $derived(
		usesFullRoster ? filtered.length : studentsPage.totalStudents,
	);
	const listLoading = $derived(
		usesFullRoster ? studentsPage.loadingFullRoster : studentsPage.listLoading,
	);
	const listLoadingMore = $derived(usesFullRoster ? false : studentsPage.listLoadingMore);
	const listHasMore = $derived(
		usesFullRoster ? windowed.hasMore : studentsPage.students.length < studentsPage.totalStudents,
	);
	const listVisible = $derived(
		usesFullRoster ? windowed.visible : filtered,
	);
	const listVisibleCount = $derived(listVisible.length);
	const selectionPool = $derived([...studentsPage.students, ...studentsPage.fullRosterStudents]);

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
	]);

	const statusStyle: Record<Student['status'], string> = {
		active: 'bg-secondary text-foreground/70',
		inactive: 'bg-secondary text-muted-foreground',
		archived: 'bg-secondary/60 text-muted-foreground',
	};

	const badgeStyle: Record<NonNullable<Student['academicBadge']>, string> = {
		honor: 'bg-secondary text-foreground/80',
		warning: 'bg-highlight-soft text-highlight',
	};

	const statusKeys = ['all', 'active', 'inactive', 'archived'] as const;

	const classFilterGroups = $derived(
		hierarchy.map(group => ({
			label: group.level,
			options: group.classes.map(classGroup => ({
				value: classGroup.id,
				label: `${classGroup.name} · ${classGroup.studentCount}`,
			})),
		})),
	);

	function statusLabel(key: (typeof statusKeys)[number]) {
		return key === 'all' ? $t('filter.all') : $t(`studentStatus.${key}`);
	}

	const statusFilterActive = $derived(studentsPage.filters.values.status !== 'all' ? 1 : 0);
	const statusFilterOptions = $derived(
		statusKeys.map(key => ({
			value: key,
			label: statusLabel(key),
		})),
	);

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

	function handleCreated(studentId: string) {
		const path = detailHref.schoolStudent(studentId);
		appGoto(`${path}${detailNavigationSearch($page.url)}`);
	}

	function applyFacetFilter(field: 'class' | 'status', value: string) {
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
		appGoto(detailHrefFor(student, modal));
	}

	function exportSelected() {
		const selectedStudents = selection.resolveSelected(selectionPool);
		if (selectedStudents.length === 0) {
			return;
		}
		downloadCsv('students-selected.csv', [
			['name', 'email', 'class', 'status', 'average', 'attendance'],
			...selectedStudents.map((student) => {
				const classGroup = classes.find(entry => entry.id === student.classId);
				return [
					student.name,
					student.email,
					classGroup?.name ?? student.classId,
					student.status,
					student.average.toFixed(1),
					attendanceLabel(student.attendance),
				];
			}),
		]);
		toast.success($t('list.exportedCount', { n: selectedStudents.length }));
	}
</script>

<div class="animate-fade-in">
	<ListPageHeader
		eyebrow={$t('students.schoolRoster')}
		title={$t('students.countLabel', { n: listTotal })}
	>
		{#snippet search()}
			<ListSearchField
				value={studentsPage.filters.values.q}
				oninput={event => studentsPage.filters.patch({ q: event.currentTarget.value })}
				placeholder={$t('common.searchStudent')}
			/>
		{/snippet}
		{#snippet filters()}
			<FilterSelect
				value={studentsPage.filters.values.class}
				class="h-9 w-48 rounded-full text-xs"
				options={[{ value: 'all', label: $t('common.allClasses') }]}
				groups={classFilterGroups}
				onchange={value => applyFacetFilter('class', value)}
			/>
			<FilterPanel activeCount={statusFilterActive} title={$t('students.statusFilter')}>
				<FilterSelect
					value={studentsPage.filters.values.status}
					class="h-9 w-full rounded-md text-xs"
					options={statusFilterOptions}
					onchange={value => applyFacetFilter('status', value)}
				/>
			</FilterPanel>
		{/snippet}
		{#snippet more()}
			<ListMoreMenu
				{view}
				onEnterSelectMode={selection.selectionMode ? undefined : () => selection.enterSelectionMode()}
				onViewChange={value => (view = value)}
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
						class="rounded-full"
						{disabled}
						{title}
						onclick={() => (createOpen.open = true)}
					>
						<Plus class="mr-1 h-4 w-4" />
						{$t('students.newStudent')}
					</Button>
				{/snippet}
			</PermissionGate>
		{/snippet}
	</ListPageHeader>

	<StudentCreateModal
		bind:open={createOpen.open}
		onOpenChange={closeUrlModal(modals)}
		{hierarchy}
		createStudent={input => studentsPage.createStudent(input)}
		onCreated={handleCreated}
	/>

	{#if selection.selectionMode}
		<ListSelectionBar
			selectedCount={selection.selectedIds.length}
			onExport={exportSelected}
			onClear={() => selection.exitSelectionMode()}
		/>
	{/if}

	{#if view === 'table'}
		<ListEntityTable
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
			onRowClick={student => selection.handleRowClick(student, onSelect)}
		>
			{#snippet trailingHeader()}
				<div class="col-span-1"></div>
			{/snippet}
			{#snippet row(student, ctx)}
				{@const classGroup = classes.find(entry => entry.id === student.classId)}
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
				<div class="col-span-2 text-sm text-foreground/80">{classGroup?.name}</div>
				<div class="col-span-2 font-display text-base font-semibold tabular-nums">
					{student.average.toFixed(1)}
				</div>
				<div class="col-span-2">
					{#if student.attendance == null}
						<p class="font-mono text-[10px] text-muted-foreground">—</p>
					{:else}
						<div class="h-1.5 w-full overflow-hidden rounded-full bg-secondary">
							<div class="h-full rounded-full bg-accent" style:width="{student.attendance}%"></div>
						</div>
						<p class="mt-1 font-mono text-[10px] text-muted-foreground">{student.attendance}%</p>
					{/if}
				</div>
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
				<div class="col-span-1 flex justify-end" role="presentation" onclick={event => event.stopPropagation()}>
					<RowActionMenu>
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
			onRowClick={student => selection.handleRowClick(student, onSelect)}
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
					<span class="font-display font-semibold tabular-nums text-sm">
						{student.average.toFixed(1)}
					</span>
				{:else if columnKey === 'attendance'}
					{#if student.attendance == null}
						<p class="font-mono text-[10px] text-muted-foreground">—</p>
					{:else}
						<div class="min-w-[7rem]">
							<div class="h-1.5 w-full overflow-hidden rounded-full bg-secondary">
								<div class="h-full rounded-full bg-accent" style:width="{student.attendance}%"></div>
							</div>
							<p class="mt-1 font-mono text-[10px] text-muted-foreground">{student.attendance}%</p>
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
				<RowActionMenu>
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
