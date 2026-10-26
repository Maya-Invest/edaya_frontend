<script lang="ts">
	import type { ListEntityTableColumn } from '$lib/list/list-entity-table-types';
	import type { ListView } from '$lib/list/list-view-url';
	import type { Student } from '$lib/types/school';
	import { afterNavigate } from '$app/navigation';
	import { page } from '$app/stores';
	import AcademicPeriodSelector from '$lib/components/layout/AcademicPeriodSelector.svelte';
	import PersonAvatar from '$lib/components/school/shared/PersonAvatar.svelte';
	import Button from '$lib/components/ui/button/button.svelte';
	import FilterSelect from '$lib/components/ui/filter-select.svelte';
	import FilterPanel from '$lib/components/ui/FilterPanel.svelte';
	import ListEntityCards from '$lib/components/ui/ListEntityCards.svelte';
	import ListEntityTable from '$lib/components/ui/ListEntityTable.svelte';
	import ListMoreMenu from '$lib/components/ui/ListMoreMenu.svelte';
	import ListPageHeader from '$lib/components/ui/ListPageHeader.svelte';
	import ListSearchField from '$lib/components/ui/ListSearchField.svelte';
	import PermissionGate from '$lib/components/ui/PermissionGate.svelte';
	import { detailHref } from '$lib/detail-hrefs';
	import { t } from '$lib/i18n';
	import { Mail, Plus } from '$lib/icons';
	import { readClassStudentListFilters } from '$lib/list/list-url-filters';
	import { readListView, writeListView } from '$lib/list/list-view-url';
	import { useInfiniteList } from '$lib/list/use-infinite-list.svelte';
	import { bindUrlModal, createUrlSyncedModals } from '$lib/modal/modal-state.svelte';
	import { MODAL_QUERY_KEY } from '$lib/modal/modal-url';
	import { appGoto } from '$lib/navigation/app-navigation';
	import { detailNavigationSearch } from '$lib/navigation/detail-navigation';
	import { currentRouteSurfaceHref, openDetailDrawer } from '$lib/navigation/route-surface-navigation';
	import StudentSubjectEnrollmentActions from '$lib/smart-components/subject-enrollment/StudentSubjectEnrollmentActions.svelte';
	import { cn } from '$lib/utils';
	import { get } from 'svelte/store';
	import StudentCreateModal from '../../../../school/students/components/StudentCreateModal.svelte';
	import { getClassStudentsPageState } from '../class-students-page.svelte';

	const { classId, onSelect, selectedId }: {
		classId: string;
		onSelect?: (student: Student) => void;
		selectedId?: string;
	} = $props();
	const classStudentsPage = getClassStudentsPageState();
	const selection = classStudentsPage.selection;
	const currentClass = $derived(classStudentsPage.currentClass);
	const filtered = $derived(classStudentsPage.visibleStudents);
	const infinite = useInfiniteList(() => filtered, 30);
	const statusStyle: Record<Student['status'], string> = {
		graduated: 'bg-secondary text-foreground/70',
		active: 'bg-secondary text-foreground/70',
		inactive: 'bg-muted text-muted-foreground',
		archived: 'bg-muted text-muted-foreground',
	};
	const badgeStyle: Record<NonNullable<Student['academicBadge']>, string> = {
		honor: 'bg-secondary text-foreground/80',
		warning: 'bg-highlight-soft text-highlight',
	};
	const statusKeys = ['all', 'active', 'inactive', 'archived'] as const;
	const statusFilterActive = $derived(classStudentsPage.filters.values.status !== 'all' ? 1 : 0);
	const statusFilterOptions = $derived(statusKeys.map(key => ({
		value: key,
		label: key === 'all' ? $t('filter.all') : $t(`studentStatus.${key}`),
	})));
	const view = $derived(readListView($page.url));
	async function exportRosterAndIdCards() {
		await classStudentsPage.performRequestDocumentIssuance({
			templateKey: 'class-roster.v1',
			sourceId: classId,
			classGroupId: classId,
			openWhenReady: false,
			successMessage: get(t)('documents.toastRequested'),
		});
		const students = classStudentsPage.visibleStudents;
		if (students.length === 0) {
			return;
		}
		await classStudentsPage.performRequestDocumentIssuanceBatch({
			templateKey: 'student-id-card.v1',
			items: students.map(student => ({
				sourceId: student.id,
				requestId: crypto.randomUUID(),
				studentId: student.id,
				classGroupId: classId,
			})),
			successMessage: get(t)('documents.toastRequested'),
		});
	}
	const modals = createUrlSyncedModals({ allowed: ['create'], getUrl: () => $page.url });
	$effect(() => {
		modals.hydrate();
	});
	afterNavigate(() => {
		if ($page.url.searchParams.has(MODAL_QUERY_KEY)) {
			return;
		}
		const canonicalHref = writeListView($page.url, view);
		if (canonicalHref !== `${$page.url.pathname}${$page.url.search}`) {
			void appGoto(canonicalHref, {
				replaceState: true,
				keepFocus: true,
				noScroll: true,
			});
		}
	});
	const createOpen = bindUrlModal(modals, 'create');
	const initialFilters = $derived(readClassStudentListFilters($page.url));
	$effect(() => {
		classStudentsPage.filters.hydrate(initialFilters);
	});
	$effect(() => {
		if (!classStudentsPage.filters.ready) {
			return;
		}
		void classStudentsPage.filters.values.status;
		void classStudentsPage.filters.values.q;
		classStudentsPage.filters.scheduleSync();
	});
	function handleCreated(studentId: string) {
		const path = detailHref.classStudent(classId, studentId);
		openDetailDrawer(`${path}${detailNavigationSearch($page.url)}`, currentRouteSurfaceHref($page.url));
	}
	function setView(next: ListView) {
		void appGoto(writeListView($page.url, next), {
			replaceState: true,
			keepFocus: true,
			noScroll: true,
		});
	}
	const columns = $derived<ListEntityTableColumn[]>([
		{ key: 'name', label: $t('students.student'), span: 5, card: { zone: 'header', showLabel: false } },
		{ key: 'average', label: $t('students.average'), span: 2, card: { zone: 'footer', showLabel: true } },
		{ key: 'attendance', label: $t('students.attendance'), span: 2, card: { zone: 'body', showLabel: true } },
		{ key: 'status', label: $t('students.status'), span: 3, card: { zone: 'footer', showLabel: false } },
	]);
</script>

<div class="animate-fade-in">
	<ListPageHeader
		filterCount={[classStudentsPage.filters.values.status].filter(value => value !== 'all').length}
		onResetFilters={() => classStudentsPage.filters.patchImmediate({ status: 'all' })}
		eyebrow={$t('students.roster')}
		title={$t('students.enrolled', { n: filtered.length })}
		description={currentClass ? `${currentClass.name}${currentClass.level ? ` · ${currentClass.level}` : ''}` : undefined}
	>
		{#snippet search()}
			<ListSearchField onCommit={() => classStudentsPage.filters.syncNow()}
				bind:value={classStudentsPage.filters.values.q}
				oninput={() => classStudentsPage.filters.scheduleSync()}
				placeholder={$t('common.searchStudent')}
			/>
		{/snippet}
		{#snippet filters()}
			<FilterPanel activeCount={statusFilterActive} title={$t('students.statusFilter')}>
				<FilterSelect
					bind:value={classStudentsPage.filters.values.status}
					class="h-9 w-full rounded-md text-xs"
					options={statusFilterOptions}
					onchange={() => classStudentsPage.filters.scheduleSync()}
				/>
			</FilterPanel>
		{/snippet}
		{#snippet more()}
			<ListMoreMenu {view} onEnterSelectMode={selection.selectionMode ? undefined : () => selection.enterSelectionMode()} onViewChange={setView} exportLabel={$t('documents.exportRoster')} onExport={() => void exportRosterAndIdCards()} />
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
						onclick={() => modals.open('create')}
					>
						<Plus class="mr-1 h-4 w-4" />
						{$t('students.newStudent')}
					</Button>
				{/snippet}
			</PermissionGate>
		{/snippet}
	</ListPageHeader>

	<div class="mb-4 flex flex-wrap items-center gap-3">
		<span class="text-xs text-muted-foreground">{$t('academic.assessmentMetrics')}</span>
		<AcademicPeriodSelector />
	</div>

	{#if createOpen.open}
		<StudentCreateModal
			bind:open={createOpen.open}
			hierarchy={classStudentsPage.hierarchy}
			defaultClassGroupId={classId}
			createStudent={input => classStudentsPage.createStudent(input)}
			onCreated={handleCreated}
		/>
	{/if}

	<StudentSubjectEnrollmentActions {selection} students={classStudentsPage.students} onSaved={() => classStudentsPage.invalidateIfStale()} />

	{#snippet studentField(student: Student, key: string)}
		{#if key === 'name'}
			<div class="flex min-w-0 items-center gap-3">
				<PersonAvatar name={student.name} initials={student.initials} photoUrl={student.photoUrl} size="list" />
				<div class="min-w-0"><p class="truncate text-sm font-medium">{student.name}</p><p class="flex items-center gap-1 truncate text-xs text-muted-foreground"><Mail class="h-3 w-3" />{student.email}</p></div>
			</div>
		{:else if key === 'average'}
			<span class="font-sans font-semibold tabular-nums">{student.average.toFixed(2)} <span class="text-xs text-muted-foreground">/ 20</span></span>
		{:else if key === 'attendance'}
			{#if student.attendance === null}<span class="text-sm text-muted-foreground">—</span>{:else}<div class="h-1.5 overflow-hidden rounded-full bg-secondary"><div class="h-full rounded-full bg-accent" style:width="{student.attendance}%"></div></div><p class="mt-1 text-xs tabular-nums text-muted-foreground">{student.attendance}%</p>{/if}
		{:else if key === 'status'}
			<div class="flex flex-wrap gap-1"><span class={cn('rounded-full px-2 py-0.5 text-xs font-medium', statusStyle[student.status])}>{$t(`studentStatus.${student.status}`)}</span>{#if student.academicBadge}<span class={cn('rounded-full px-2 py-0.5 text-xs font-medium', badgeStyle[student.academicBadge])}>{$t(`studentStatus.${student.academicBadge}`)}</span>{/if}</div>
		{/if}
	{/snippet}
	{#if view === 'table'}
		<ListEntityTable listKey="ClassStudentsList" {columns} rows={infinite.visible} highlightId={selectedId}
			selectionMode={selection.selectionMode} selectedIds={selection.selectedIds}
			onToggleSelected={(id, checked) => selection.toggleSelected(id, checked)}
			onToggleAllVisible={checked => selection.toggleVisible(infinite.visible, checked)} allVisibleSelected={selection.allVisibleSelected(infinite.visible)}
			hasMore={infinite.hasMore} total={infinite.total} visibleCount={infinite.visible.length} onLoadMore={infinite.loadMore}
			onRowClick={student => selection.handleRowClick(student, onSelect)}>
			{#snippet cell(student, column)}{@render studentField(student, column.key)}{/snippet}
		</ListEntityTable>
	{:else}
		<ListEntityCards {columns} rows={infinite.visible} highlightId={selectedId}
			selectionMode={selection.selectionMode} selectedIds={selection.selectedIds} onToggleSelected={(id, checked) => selection.toggleSelected(id, checked)}
			hasMore={infinite.hasMore} total={infinite.total} visibleCount={infinite.visible.length} onLoadMore={infinite.loadMore}
			onRowClick={student => selection.handleRowClick(student, onSelect)}>
			{#snippet field(student, key)}{@render studentField(student, key)}{/snippet}
		</ListEntityCards>
	{/if}
</div>
