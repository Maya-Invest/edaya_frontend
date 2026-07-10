<script lang="ts">
	import type { Student } from '$lib/types/school';
	import { page } from '$app/stores';
	import PersonAvatar from '$lib/components/school/shared/PersonAvatar.svelte';
	import Button from '$lib/components/ui/button/button.svelte';
	import Checkbox from '$lib/components/ui/checkbox/checkbox.svelte';
	import FilterSelect from '$lib/components/ui/filter-select.svelte';
	import FilterPanel from '$lib/components/ui/FilterPanel.svelte';
	import InfiniteList from '$lib/components/ui/InfiniteList.svelte';
	import ListMoreMenu from '$lib/components/ui/ListMoreMenu.svelte';
	import ListPageHeader from '$lib/components/ui/ListPageHeader.svelte';
	import ListSearchField from '$lib/components/ui/ListSearchField.svelte';
	import PermissionGate from '$lib/components/ui/PermissionGate.svelte';
	import RowActionMenu from '$lib/components/ui/RowActionMenu.svelte';
	import RowActionMenuItem from '$lib/components/ui/RowActionMenuItem.svelte';
	import { detailHref } from '$lib/detail-hrefs';
	import { t } from '$lib/i18n';
	import { Eye, ChevronDown, ChevronUp, GraduationCap, Pencil, Plus } from '$lib/icons';
	import { useInfiniteList } from '$lib/list/use-infinite-list.svelte';
	import { bindUrlModal, closeUrlModal, createUrlSyncedModals } from '$lib/modal/modal-state.svelte';
	import { appendModal } from '$lib/modal/modal-url';
	import { appGoto } from '$lib/navigation/app-navigation';
	import { detailNavigationSearch } from '$lib/navigation/detail-navigation';
	import { toast } from '$lib/toast.svelte';
	import { cn } from '$lib/utils';
	import { SvelteMap } from 'svelte/reactivity';
	import { studentListUsesFullRoster, cycleStudentListSort, type StudentSortColumn } from '../lib/student-list-filters';
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

	let view = $state<'table' | 'cards'>('table');
	let selectionMode = $state(false);
	let selectedIds = $state<string[]>([]);
	const selectedSet = $derived(new Set(selectedIds));
	const currentSort = $derived(studentsPage.filters.values.sort);
	const currentSortDir = $derived(studentsPage.filters.values.sortDir);

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
	const selectedStudents = $derived.by(() => {
		const byId = new SvelteMap<string, Student>();
		for (const student of [...studentsPage.students, ...studentsPage.fullRosterStudents]) {
			byId.set(student.id, student);
		}
		return selectedIds
			.map(id => byId.get(id))
			.filter((student): student is Student => Boolean(student));
	});

	function loadMoreStudents() {
		if (usesFullRoster) {
			windowed.loadMore();
			return;
		}
		void studentsPage.loadMore();
	}

	const statusStyle: Record<Student['status'], string> = {
		honor: 'bg-secondary text-foreground/80',
		active: 'bg-secondary text-foreground/70',
		warning: 'bg-highlight-soft text-highlight',
	};

	function handleCreated(studentId: string) {
		const path = detailHref.schoolStudent(studentId);
		appGoto(`${path}${detailNavigationSearch($page.url)}`);
	}

	const statusKeys = ['all', 'honor', 'active', 'warning'] as const;

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

	function sortAriaValue(column: StudentSortColumn): 'ascending' | 'descending' | 'none' {
		if (currentSort !== column) {
			return 'none';
		}
		return currentSortDir === 'asc' ? 'ascending' : 'descending';
	}

	function sortButtonLabel(column: StudentSortColumn, label: string) {
		const direction = sortAriaValue(column);
		if (direction === 'none') {
			return label;
		}
		return `${label}, ${direction === 'ascending' ? $t('list.sortAscending') : $t('list.sortDescending')}`;
	}

	function enterSelectionMode() {
		selectionMode = true;
	}

	function exitSelectionMode() {
		selectionMode = false;
		clearSelection();
	}

	function handleRowClick(student: Student) {
		if (selectionMode) {
			toggleSelected(student.id, !selectedSet.has(student.id));
			return;
		}
		onSelect?.(student);
	}

	function handleRowKeydown(event: KeyboardEvent, student: Student) {
		if (event.key === 'Enter' || event.key === ' ') {
			event.preventDefault();
			handleRowClick(student);
		}
	}

	function detailHrefFor(student: Student, modal: 'edit-profile' | 'change-class' | undefined = undefined) {
		const href = `${detailHref.schoolStudent(student.id)}${detailNavigationSearch($page.url)}`;
		return modal ? appendModal(href, modal) : href;
	}

	function openStudentAction(event: MouseEvent, student: Student, modal: 'edit-profile' | 'change-class' | undefined = undefined) {
		event.stopPropagation();
		appGoto(detailHrefFor(student, modal));
	}

	function toggleSelected(studentId: string, checked: boolean) {
		selectedIds = checked
			? [...new Set([...selectedIds, studentId])]
			: selectedIds.filter(id => id !== studentId);
	}

	function clearSelection() {
		selectedIds = [];
	}

	function csvCell(value: string | number | null | undefined) {
		const text = String(value ?? '');
		return /[",\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
	}

	function exportSelected() {
		if (selectedStudents.length === 0) {
			return;
		}
		const rows = [
			['name', 'email', 'class', 'status', 'average', 'attendance'],
			...selectedStudents.map((student) => {
				const classGroup = classes.find(entry => entry.id === student.classId);
				return [
					student.name,
					student.email,
					classGroup?.name ?? student.classId,
					student.status,
					student.average.toFixed(1),
					`${student.attendance}%`,
				];
			}),
		];
		const csv = rows.map(row => row.map(csvCell).join(',')).join('\n');
		const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
		const href = URL.createObjectURL(blob);
		const link = document.createElement('a');
		link.href = href;
		link.download = 'students-selected.csv';
		link.click();
		URL.revokeObjectURL(href);
		toast.success($t('list.exportedCount', { n: selectedStudents.length }));
	}

	const allVisibleSelected = $derived(
		listVisible.length > 0 && listVisible.every(student => selectedSet.has(student.id)),
	);

	function toggleVisible(checked: boolean) {
		if (!checked) {
			selectedIds = selectedIds.filter(id => !listVisible.some(student => student.id === id));
			return;
		}
		selectedIds = [...new Set([...selectedIds, ...listVisible.map(student => student.id)])];
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
				onEnterSelectMode={selectionMode ? undefined : enterSelectionMode}
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
		onCreated={handleCreated}
	/>

	{#if selectionMode}
		<div class="mb-3 flex items-center justify-between gap-3 rounded-xl border border-border bg-card px-4 py-2 shadow-soft">
			<p class="text-sm font-medium">
				{selectedIds.length > 0
					? $t('list.selectedCount', { n: selectedIds.length })
					: $t('list.selectRowsHint')}
			</p>
			<div class="flex items-center gap-2">
				<Button
					variant="outline"
					size="sm"
					class="rounded-full"
					disabled={selectedIds.length === 0}
					onclick={exportSelected}
				>
					{$t('list.export')}
				</Button>
				<Button variant="ghost" size="sm" class="rounded-full" onclick={exitSelectionMode}>
					{$t('common.clear')}
				</Button>
			</div>
		</div>
	{/if}

	{#if view === 'table'}
		<div
			class="overflow-hidden rounded-2xl border border-border bg-card shadow-soft"
			aria-busy={listLoading}
		>
			<div
				class="grid grid-cols-12 gap-4 border-b border-border bg-secondary/40 px-5 py-3 text-[11px] font-medium uppercase tracking-wider text-muted-foreground"
			>
				{#if selectionMode}
					<div class="col-span-1 flex items-center">
						<div role="presentation" onclick={event => event.stopPropagation()}>
							<Checkbox
								class="rounded-[2px]"
								checked={allVisibleSelected}
								onCheckedChange={checked => toggleVisible(checked === true)}
								aria-label={$t('list.selectAll')}
							/>
						</div>
					</div>
				{/if}
				<div class="col-span-3 flex items-center">
					<button
						type="button"
						class={cn(
							'flex items-center gap-1 transition-colors hover:text-foreground',
							currentSort === 'name' && 'text-foreground',
						)}
						aria-label={sortButtonLabel('name', $t('students.student'))}
						onclick={() => cycleSort('name')}
					>
						{$t('students.student')}
						{#if currentSort === 'name'}
							{#if currentSortDir === 'asc'}
								<ChevronUp class="h-3 w-3" />
							{:else}
								<ChevronDown class="h-3 w-3" />
							{/if}
						{/if}
					</button>
				</div>
				<div class="col-span-2 flex items-center">
					<button
						type="button"
						class={cn(
							'flex items-center gap-1 transition-colors hover:text-foreground',
							currentSort === 'class' && 'text-foreground',
						)}
						aria-label={sortButtonLabel('class', $t('students.class'))}
						onclick={() => cycleSort('class')}
					>
						{$t('students.class')}
						{#if currentSort === 'class'}
							{#if currentSortDir === 'asc'}
								<ChevronUp class="h-3 w-3" />
							{:else}
								<ChevronDown class="h-3 w-3" />
							{/if}
						{/if}
					</button>
				</div>
				<div class="col-span-2 flex items-center">
					<button
						type="button"
						class={cn(
							'flex items-center gap-1 transition-colors hover:text-foreground',
							currentSort === 'average' && 'text-foreground',
						)}
						aria-label={sortButtonLabel('average', $t('students.average'))}
						onclick={() => cycleSort('average')}
					>
						{$t('students.average')}
						{#if currentSort === 'average'}
							{#if currentSortDir === 'asc'}
								<ChevronUp class="h-3 w-3" />
							{:else}
								<ChevronDown class="h-3 w-3" />
							{/if}
						{/if}
					</button>
				</div>
				<div class="col-span-2 flex items-center">
					<button
						type="button"
						class={cn(
							'flex items-center gap-1 transition-colors hover:text-foreground',
							currentSort === 'attendance' && 'text-foreground',
						)}
						aria-label={sortButtonLabel('attendance', $t('students.attendance'))}
						onclick={() => cycleSort('attendance')}
					>
						{$t('students.attendance')}
						{#if currentSort === 'attendance'}
							{#if currentSortDir === 'asc'}
								<ChevronUp class="h-3 w-3" />
							{:else}
								<ChevronDown class="h-3 w-3" />
							{/if}
						{/if}
					</button>
				</div>
				<div class={cn('flex items-center', selectionMode ? 'col-span-1' : 'col-span-2')}>
					<button
						type="button"
						class={cn(
							'flex items-center gap-1 transition-colors hover:text-foreground',
							currentSort === 'status' && 'text-foreground',
						)}
						aria-label={sortButtonLabel('status', $t('students.status'))}
						onclick={() => cycleSort('status')}
					>
						{$t('students.status')}
						{#if currentSort === 'status'}
							{#if currentSortDir === 'asc'}
								<ChevronUp class="h-3 w-3" />
							{:else}
								<ChevronDown class="h-3 w-3" />
							{/if}
						{/if}
					</button>
				</div>
				<div class="col-span-1"></div>
			</div>
			<InfiniteList
				hasMore={listHasMore}
				total={listTotal}
				visibleCount={listVisibleCount}
				loading={listLoading || listLoadingMore}
				onLoadMore={loadMoreStudents}
			>
				<ul class={cn(listLoading && 'opacity-60')}>
					{#each listVisible as student (student.id)}
						{@const classGroup = classes.find(entry => entry.id === student.classId)}
						{@const active = selectedId === student.id}
						<li>
							<div
								role="button"
								tabindex="0"
								onclick={() => handleRowClick(student)}
								onkeydown={event => handleRowKeydown(event, student)}
								class={cn(
									'grid w-full grid-cols-12 items-center gap-4 border-b border-border px-5 py-3.5 text-left transition-colors last:border-b-0',
									active ? 'bg-primary/10' : 'hover:bg-secondary',
									selectionMode && selectedSet.has(student.id) && 'bg-primary/5',
								)}
							>
								{#if selectionMode}
									<div class="col-span-1 flex items-center" role="presentation" onclick={event => event.stopPropagation()}>
										<Checkbox
											class="rounded-[2px]"
											checked={selectedSet.has(student.id)}
											onCheckedChange={checked => toggleSelected(student.id, checked === true)}
											aria-label={$t('list.selectRow')}
										/>
									</div>
								{/if}
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
										<p class="truncate text-xs text-muted-foreground">{student.email}</p>
									</div>
								</div>
								<div class="col-span-2 text-sm text-foreground/80">{classGroup?.name}</div>
								<div class="col-span-2 font-display text-base font-semibold tabular-nums">
									{student.average.toFixed(1)}
								</div>
								<div class="col-span-2">
									<div class="h-1.5 w-full overflow-hidden rounded-full bg-secondary">
										<div class="h-full rounded-full bg-accent" style:width="{student.attendance}%"></div>
									</div>
									<p class="mt-1 font-mono text-[10px] text-muted-foreground">{student.attendance}%</p>
								</div>
								<div class={cn(selectionMode ? 'col-span-1' : 'col-span-2')}>
									<span
										class={cn(
											'rounded-full px-2 py-0.5 text-[10px] font-medium',
											statusStyle[student.status],
										)}
									>
										{$t(`studentStatus.${student.status}`)}
									</span>
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
							</div>
						</li>
					{/each}
					{#if listVisible.length === 0 && !listLoading}
						<li class="px-5 py-12 text-center text-sm text-muted-foreground">
							{$t('students.noMatch')}
						</li>
					{/if}
				</ul>
			</InfiniteList>
		</div>
	{:else}
		<div aria-busy={listLoading}>
			<InfiniteList
				hasMore={listHasMore}
				total={listTotal}
				visibleCount={listVisibleCount}
				loading={listLoading || listLoadingMore}
				onLoadMore={loadMoreStudents}
			>
				<div class={cn('grid gap-3 sm:grid-cols-2 lg:grid-cols-3', listLoading && 'opacity-60')}>
					{#each listVisible as student (student.id)}
						{@const classGroup = classes.find(entry => entry.id === student.classId)}
						{@const active = selectedId === student.id}
						<div
							role="button"
							tabindex="0"
							onclick={() => handleRowClick(student)}
							onkeydown={event => handleRowKeydown(event, student)}
							class={cn(
								'rounded-2xl border border-border bg-card p-5 text-left shadow-soft transition hover:-translate-y-0.5 hover:shadow-panel',
								active && 'border-primary/40 bg-primary/5',
								selectionMode && selectedSet.has(student.id) && 'border-primary/30 bg-primary/5',
							)}
						>
							<div class="mb-3 flex items-center justify-between gap-2">
								{#if selectionMode}
									<div role="presentation" onclick={event => event.stopPropagation()}>
										<Checkbox
											class="rounded-[2px]"
											checked={selectedSet.has(student.id)}
											onCheckedChange={checked => toggleSelected(student.id, checked === true)}
											aria-label={$t('list.selectRow')}
										/>
									</div>
								{:else}
									<div></div>
								{/if}
								<div role="presentation" onclick={event => event.stopPropagation()}>
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
							</div>
							<div class="flex items-center gap-3">
								<PersonAvatar
									name={student.name}
									initials={student.initials}
									photoUrl={student.photoUrl}
									size="list"
								/>
								<div class="min-w-0">
									<p class="truncate font-medium">{student.name}</p>
									<p class="truncate text-xs text-muted-foreground">{classGroup?.name}</p>
								</div>
							</div>
							<div class="mt-4 flex items-center justify-between text-sm">
								<span class="font-display font-semibold tabular-nums">{student.average.toFixed(1)}</span>
								<span
									class={cn(
										'rounded-full px-2 py-0.5 text-[10px] font-medium',
										statusStyle[student.status],
									)}
								>
									{$t(`studentStatus.${student.status}`)}
								</span>
							</div>
						</div>
					{/each}
				</div>
				{#if listVisible.length === 0 && !listLoading}
					<p class="py-12 text-center text-sm text-muted-foreground">{$t('students.noMatch')}</p>
				{/if}
			</InfiniteList>
		</div>
	{/if}
</div>
