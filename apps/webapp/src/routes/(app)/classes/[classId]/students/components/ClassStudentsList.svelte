<script lang="ts">
	import { provideCollectionPresentation } from '$lib/list/collection-presentation.svelte';

	provideCollectionPresentation();
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
	import { lang, t } from '$lib/i18n';
	import { Plus } from '$lib/icons';
	import { readListView, writeListView } from '$lib/list/list-view-url';
	import { bindUrlModal, createUrlSyncedModals } from '$lib/modal/modal-state.svelte';
	import { MODAL_QUERY_KEY } from '$lib/modal/modal-url';
	import { appGoto } from '$lib/navigation/app-navigation';
	import { detailNavigationSearch } from '$lib/navigation/detail-navigation';
	import { currentRouteSurfaceHref, openDetailDrawer } from '$lib/navigation/route-surface-navigation';
	import StudentSubjectEnrollmentActions from '$lib/smart-components/subject-enrollment/StudentSubjectEnrollmentActions.svelte';
	import { toast } from '$lib/toast.svelte';
	import { cn } from '$lib/utils';
	import { get } from 'svelte/store';
	import StudentCreateModal from '../../../../school/students/components/StudentCreateModal.svelte';
	import { getClassStudentsPageState } from '../class-students-page.svelte';
	import { ClassRosterExport } from '../lib/class-roster-export';

	const { classId, onSelect, selectedId }: {
		classId: string;
		onSelect?: (student: Student) => void;
		selectedId?: string;
	} = $props();
	const classStudentsPage = getClassStudentsPageState();
	const selection = classStudentsPage.selection;
	const currentClass = $derived(classStudentsPage.currentClass);
	const students = $derived(classStudentsPage.students);
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
	const rosterExport = new ClassRosterExport();
	let exporting = $state(false);
	async function exportRosterAndIdCards() {
		if (exporting)
			return;
		exporting = true;
		try {
			const selection = await classStudentsPage.matchingMemberIds();
			const locale = get(lang);
			const successMessage = get(t)('documents.toastRequested');
			const remaining = await rosterExport.request({ ...selection, key: JSON.stringify([selection.key, locale]), classId }, {
				roster: async requestId => Boolean(await classStudentsPage.performRequestDocumentIssuance({
					requestId,
					locale,
					templateKey: 'class-roster.v1',
					sourceId: classId,
					classGroupId: classId,
					openWhenReady: false,
					successMessage,
				})),
				cards: items => classStudentsPage.performRequestDocumentIssuanceBatch({ locale, templateKey: 'student-id-card.v1', items, successMessage }),
			});
			if (remaining)
				toast.error(get(t)('documents.rosterCardFailures', { n: remaining }));
		}
		catch (error) {
			if (!(error instanceof DOMException && error.name === 'AbortError'))
				toast.error(get(t)('documents.toastFailed', { code: error instanceof Error ? error.message : String(error) }));
		}
		finally {
			exporting = false;
		}
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
		title={$t('students.enrolled', { n: classStudentsPage.totalStudents })}
		description={currentClass ? `${currentClass.name}${currentClass.level ? ` · ${currentClass.level}` : ''}` : undefined}
	>
		{#snippet search()}
			<ListSearchField onCommit={() => classStudentsPage.filters.syncNow()}
				value={classStudentsPage.filters.values.q}
				oninput={event => classStudentsPage.filters.patch({ q: event.currentTarget.value })}
				placeholder={$t('common.searchStudent')}
			/>
		{/snippet}
		{#snippet filters()}
			<FilterPanel activeCount={statusFilterActive} title={$t('students.statusFilter')}>
				<FilterSelect
					value={classStudentsPage.filters.values.status}
					class="h-9 w-full rounded-md text-xs"
					options={statusFilterOptions}
					onchange={value => classStudentsPage.filters.patchImmediate({ status: value })}
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
				<PersonAvatar name={student.name} initials={student.initials} photoUrl={student.photoUrl} studentPortrait={student.photoAttachmentId ? { studentId: student.id, attachmentId: student.photoAttachmentId } : undefined} size="list" />
				<div class="min-w-0"><p class="truncate text-sm font-medium">{student.name}</p></div>
			</div>
		{:else if key === 'average'}
			{#if student.gradesAvailable === false}<span class="text-sm text-muted-foreground">—</span>{:else}<span class="font-sans font-semibold tabular-nums">{student.average.toFixed(2)} <span class="text-xs text-muted-foreground">/ 20</span></span>{/if}
		{:else if key === 'attendance'}
			{#if student.attendance === null}<span class="text-sm text-muted-foreground">—</span>{:else}<div class="h-1.5 overflow-hidden rounded-full bg-secondary"><div class="h-full rounded-full bg-accent" style:width="{student.attendance}%"></div></div><p class="mt-1 text-xs tabular-nums text-muted-foreground">{student.attendance}%</p>{/if}
		{:else if key === 'status'}
			<div class="flex flex-wrap gap-1"><span class={cn('rounded-full px-2 py-0.5 text-xs font-medium', statusStyle[student.status])}>{$t(`studentStatus.${student.status}`)}</span>{#if student.academicBadge}<span class={cn('rounded-full px-2 py-0.5 text-xs font-medium', badgeStyle[student.academicBadge])}>{$t(`studentStatus.${student.academicBadge}`)}</span>{/if}</div>
		{/if}
	{/snippet}
	{#if view === 'table'}
		<ListEntityTable listKey="ClassStudentsList" {columns} rows={students} highlightId={selectedId}
			selectionMode={selection.selectionMode} selectedIds={selection.selectedIds}
			onToggleSelected={(id, checked) => selection.toggleSelected(id, checked)}
			onToggleAllVisible={checked => selection.toggleVisible(students, checked)} allVisibleSelected={selection.allVisibleSelected(students)}
			hasMore={classStudentsPage.hasMore} total={classStudentsPage.totalStudents} visibleCount={students.length} loadingMore={classStudentsPage.listLoadingMore} onLoadMore={() => classStudentsPage.loadMore()}
			onRowClick={onSelect}>
			{#snippet cell(student, column)}{@render studentField(student, column.key)}{/snippet}
		</ListEntityTable>
	{:else}
		<ListEntityCards {columns} rows={students} highlightId={selectedId}
			selectionMode={selection.selectionMode} selectedIds={selection.selectedIds} onToggleSelected={(id, checked) => selection.toggleSelected(id, checked)}
			hasMore={classStudentsPage.hasMore} total={classStudentsPage.totalStudents} visibleCount={students.length} loadingMore={classStudentsPage.listLoadingMore} onLoadMore={() => classStudentsPage.loadMore()}
			onRowClick={onSelect}>
			{#snippet field(student, key)}{@render studentField(student, key)}{/snippet}
		</ListEntityCards>
	{/if}
</div>
