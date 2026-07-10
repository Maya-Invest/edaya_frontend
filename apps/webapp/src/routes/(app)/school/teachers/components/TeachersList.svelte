<script lang="ts">
	import type { Teacher } from '$lib/types/school';
	import { page } from '$app/stores';
	import PersonAvatar from '$lib/components/school/shared/PersonAvatar.svelte';
	import Button from '$lib/components/ui/button/button.svelte';
	import Checkbox from '$lib/components/ui/checkbox/checkbox.svelte';
	import InfiniteList from '$lib/components/ui/InfiniteList.svelte';
	import ListMoreMenu from '$lib/components/ui/ListMoreMenu.svelte';
	import ListPageHeader from '$lib/components/ui/ListPageHeader.svelte';
	import ListSearchField from '$lib/components/ui/ListSearchField.svelte';
	import PermissionGate from '$lib/components/ui/PermissionGate.svelte';
	import { t } from '$lib/i18n';
	import { ChevronDown, ChevronUp, Mail, Phone, Plus } from '$lib/icons';
	import { useInfiniteList } from '$lib/list/use-infinite-list.svelte';
	import { bindUrlModal, createUrlSyncedModals } from '$lib/modal/modal-state.svelte';
	import { toast } from '$lib/toast.svelte';
	import { cn } from '$lib/utils';
	import { SvelteMap } from 'svelte/reactivity';
	import {
		cycleTeacherListSort,
		teacherListUsesFullRoster,
		type TeacherSortColumn,
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

	let selectionMode = $state(false);
	let selectedIds = $state<string[]>([]);
	const selectedSet = $derived(new Set(selectedIds));
	const currentSort = $derived(teachersPage.filters.values.sort);
	const currentSortDir = $derived(teachersPage.filters.values.sortDir);

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
	const selectedTeachers = $derived.by(() => {
		const byId = new SvelteMap<string, Teacher>();
		for (const teacher of [...teachersPage.teachers, ...teachersPage.fullRosterTeachers]) {
			byId.set(teacher.id, teacher);
		}
		return selectedIds
			.map(id => byId.get(id))
			.filter((teacher): teacher is Teacher => Boolean(teacher));
	});

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

	function sortAriaValue(column: TeacherSortColumn): 'ascending' | 'descending' | 'none' {
		if (currentSort !== column) {
			return 'none';
		}
		return currentSortDir === 'asc' ? 'ascending' : 'descending';
	}

	function sortButtonLabel(column: TeacherSortColumn, label: string) {
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

	function handleRowClick(teacher: Teacher) {
		if (selectionMode) {
			toggleSelected(teacher.id, !selectedSet.has(teacher.id));
			return;
		}
		onSelect?.(teacher);
	}

	function handleRowKeydown(event: KeyboardEvent, teacher: Teacher) {
		if (event.key === 'Enter' || event.key === ' ') {
			event.preventDefault();
			handleRowClick(teacher);
		}
	}

	function toggleSelected(teacherId: string, checked: boolean) {
		selectedIds = checked
			? [...new Set([...selectedIds, teacherId])]
			: selectedIds.filter(id => id !== teacherId);
	}

	function clearSelection() {
		selectedIds = [];
	}

	function csvCell(value: string | number | null | undefined) {
		const text = String(value ?? '');
		return /[",\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
	}

	function exportSelected() {
		if (selectedTeachers.length === 0) {
			return;
		}
		const rows = [
			['name', 'email', 'phone', 'assignments', 'status'],
			...selectedTeachers.map((teacher) => {
				return [
					teacher.name,
					teacher.email,
					teacher.phone,
					teachersPage.assignmentCount(teacher.id),
					teacher.isActive ? 'active' : 'inactive',
				];
			}),
		];
		const csv = rows.map(row => row.map(csvCell).join(',')).join('\n');
		const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
		const href = URL.createObjectURL(blob);
		const link = document.createElement('a');
		link.href = href;
		link.download = 'teachers-selected.csv';
		link.click();
		URL.revokeObjectURL(href);
		toast.success($t('list.exportedCount', { n: selectedTeachers.length }));
	}

	const allVisibleSelected = $derived(
		listVisible.length > 0 && listVisible.every(teacher => selectedSet.has(teacher.id)),
	);

	function toggleVisible(checked: boolean) {
		if (!checked) {
			selectedIds = selectedIds.filter(id => !listVisible.some(teacher => teacher.id === id));
			return;
		}
		selectedIds = [...new Set([...selectedIds, ...listVisible.map(teacher => teacher.id)])];
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
				onEnterSelectMode={selectionMode ? undefined : enterSelectionMode}
			/>
		{/snippet}
	</ListPageHeader>

	<TeacherCreateModal bind:open={createOpen.open} />

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
			<div class={cn('flex items-center', selectionMode ? 'col-span-4' : 'col-span-5')}>
				<button
					type="button"
					class={cn(
						'flex items-center gap-1 transition-colors hover:text-foreground',
						currentSort === 'name' && 'text-foreground',
					)}
					aria-label={sortButtonLabel('name', $t('people.name'))}
					onclick={() => cycleSort('name')}
				>
					{$t('people.name')}
					{#if currentSort === 'name'}
						{#if currentSortDir === 'asc'}
							<ChevronUp class="h-3 w-3" />
						{:else}
							<ChevronDown class="h-3 w-3" />
						{/if}
					{/if}
				</button>
			</div>
			<div class="col-span-3 flex items-center">
				<button
					type="button"
					class={cn(
						'flex items-center gap-1 transition-colors hover:text-foreground',
						currentSort === 'assignments' && 'text-foreground',
					)}
					aria-label={sortButtonLabel('assignments', $t('teacher.assignmentsColumn'))}
					onclick={() => cycleSort('assignments')}
				>
					{$t('teacher.assignmentsColumn')}
					{#if currentSort === 'assignments'}
						{#if currentSortDir === 'asc'}
							<ChevronUp class="h-3 w-3" />
						{:else}
							<ChevronDown class="h-3 w-3" />
						{/if}
					{/if}
				</button>
			</div>
			<div class="col-span-4 flex items-center">
				<button
					type="button"
					class={cn(
						'flex items-center gap-1 transition-colors hover:text-foreground',
						currentSort === 'status' && 'text-foreground',
					)}
					aria-label={sortButtonLabel('status', $t('common.status'))}
					onclick={() => cycleSort('status')}
				>
					{$t('common.status')}
					{#if currentSort === 'status'}
						{#if currentSortDir === 'asc'}
							<ChevronUp class="h-3 w-3" />
						{:else}
							<ChevronDown class="h-3 w-3" />
						{/if}
					{/if}
				</button>
			</div>
		</div>
		<InfiniteList
			hasMore={listHasMore}
			total={listTotal}
			visibleCount={listVisibleCount}
			loading={listLoading || listLoadingMore}
			onLoadMore={loadMoreTeachers}
		>
			<ul class={cn(listLoading && 'opacity-60')}>
				{#each listVisible as teacher (teacher.id)}
					{@const active = selectedId === teacher.id}
					<li>
						<div
							role="button"
							tabindex="0"
							onclick={() => handleRowClick(teacher)}
							onkeydown={event => handleRowKeydown(event, teacher)}
							class={cn(
								'grid w-full grid-cols-12 items-center gap-4 border-b border-border px-5 py-4 text-left transition-colors last:border-b-0',
								active ? 'bg-primary/10' : 'hover:bg-secondary',
								selectionMode && selectedSet.has(teacher.id) && 'bg-primary/5',
								!teacher.isActive && 'opacity-60',
							)}
						>
							{#if selectionMode}
								<div class="col-span-1 flex items-center" role="presentation" onclick={event => event.stopPropagation()}>
									<Checkbox
										class="rounded-[2px]"
										checked={selectedSet.has(teacher.id)}
										onCheckedChange={checked => toggleSelected(teacher.id, checked === true)}
										aria-label={$t('list.selectRow')}
									/>
								</div>
							{/if}
							<div class={cn('flex items-center gap-3', selectionMode ? 'col-span-4' : 'col-span-5')}>
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
</div>
