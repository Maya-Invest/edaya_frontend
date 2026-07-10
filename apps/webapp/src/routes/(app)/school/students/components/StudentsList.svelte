<script lang="ts">
	import type { Student } from '$lib/types/school';
	import Button from '$lib/components/ui/button/button.svelte';
	import FilterSelect from '$lib/components/ui/filter-select.svelte';
	import FilterPanel from '$lib/components/ui/FilterPanel.svelte';
	import InfiniteList from '$lib/components/ui/InfiniteList.svelte';
	import ListMoreMenu from '$lib/components/ui/ListMoreMenu.svelte';
	import ListPageHeader from '$lib/components/ui/ListPageHeader.svelte';
	import ListSearchField from '$lib/components/ui/ListSearchField.svelte';
	import PermissionGate from '$lib/components/ui/PermissionGate.svelte';
	import { detailHref } from '$lib/detail-hrefs';
	import { t } from '$lib/i18n';
	import { Plus } from '$lib/icons';
	import { useInfiniteList } from '$lib/list/use-infinite-list.svelte';
	import { bindUrlModal, closeUrlModal, createUrlSyncedModals } from '$lib/modal/modal-state.svelte';
	import { page } from '$app/stores';
	import { appGoto } from '$lib/navigation/app-navigation';
	import { detailNavigationSearch } from '$lib/navigation/detail-navigation';
	import { cn } from '$lib/utils';
	import PersonAvatar from '$lib/components/school/shared/PersonAvatar.svelte';
	import StudentCreateModal from './StudentCreateModal.svelte';
	import { studentListUsesFullRoster } from '../student-list-filters';
	import {
		getStudentsPageState,
		SCHOOL_STUDENTS_PAGE_SIZE,
	} from '../students-page.svelte';

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
			<ListMoreMenu {view} onViewChange={value => (view = value)} />
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

	{#if view === 'table'}
		<div
			class="overflow-hidden rounded-2xl border border-border bg-card shadow-soft"
			aria-busy={listLoading}
		>
			<div
				class="grid grid-cols-12 gap-4 border-b border-border bg-secondary/40 px-5 py-3 text-[11px] font-medium uppercase tracking-wider text-muted-foreground"
			>
				<div class="col-span-4">{$t('students.student')}</div>
				<div class="col-span-2">{$t('students.class')}</div>
				<div class="col-span-2">{$t('students.average')}</div>
				<div class="col-span-2">{$t('students.attendance')}</div>
				<div class="col-span-2">{$t('students.status')}</div>
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
							<button
								type="button"
								onclick={() => onSelect?.(student)}
								class={cn(
									'grid w-full grid-cols-12 items-center gap-4 border-b border-border px-5 py-3.5 text-left transition-colors last:border-b-0',
									active ? 'bg-primary/10' : 'hover:bg-secondary',
								)}
							>
								<div class="col-span-4 flex items-center gap-3">
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
								<div class="col-span-2">
									<span
										class={cn(
											'rounded-full px-2 py-0.5 text-[10px] font-medium',
											statusStyle[student.status],
										)}
									>
										{$t(`studentStatus.${student.status}`)}
									</span>
								</div>
							</button>
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
						<button
							type="button"
							onclick={() => onSelect?.(student)}
							class={cn(
								'rounded-2xl border border-border bg-card p-5 text-left shadow-soft transition hover:-translate-y-0.5 hover:shadow-panel',
								active && 'border-primary/40 bg-primary/5',
							)}
						>
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
						</button>
					{/each}
				</div>
				{#if listVisible.length === 0 && !listLoading}
					<p class="py-12 text-center text-sm text-muted-foreground">{$t('students.noMatch')}</p>
				{/if}
			</InfiniteList>
		</div>
	{/if}
</div>
