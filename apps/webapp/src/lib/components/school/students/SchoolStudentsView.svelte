<script lang="ts">
	import type { Student } from '$lib/types/school';
	import { page } from '$app/stores';
	import { loadPeopleDataPage } from '$lib/api/people-data';
	import { getBrowserSchoolClient } from '$lib/api/school-client';
	import Button from '$lib/components/ui/button/button.svelte';
	import FilterSelect from '$lib/components/ui/filter-select.svelte';
	import FilterPanel from '$lib/components/ui/FilterPanel.svelte';
	import InfiniteList from '$lib/components/ui/InfiniteList.svelte';
	import ListMoreMenu from '$lib/components/ui/ListMoreMenu.svelte';
	import ListPageHeader from '$lib/components/ui/ListPageHeader.svelte';
	import ListSearchField from '$lib/components/ui/ListSearchField.svelte';
	import PermissionGate from '$lib/components/ui/PermissionGate.svelte';
	import { detailDataContext } from '$lib/detail-data/context.svelte';
	import { detailHref } from '$lib/detail-hrefs';
	import { t } from '$lib/i18n';
	import { Plus } from '$lib/icons';
	import { useOffsetInfiniteList } from '$lib/list/use-infinite-list.svelte';
	import { bindUrlModal, closeUrlModal, createUrlSyncedModals } from '$lib/modal/modal-state.svelte';
	import { appGoto } from '$lib/navigation/app-navigation';
	import { detailNavigationSearch } from '$lib/navigation/detail-navigation';
	import {
		SchoolStudentsState,
		setSchoolStudentsState,
	} from '$lib/students/school-students-state.svelte';
	import { cn } from '$lib/utils';
	import PersonAvatar from '../shared/PersonAvatar.svelte';
	import StudentCreateModal from './StudentCreateModal.svelte';

	const SCHOOL_STUDENTS_INITIAL_PAGE_SIZE = 25;

	const {
		onSelect,
		selectedId,
	}: {
		onSelect?: (s: Student) => void;
		selectedId?: string;
	} = $props();

	const studentsState = new SchoolStudentsState(() => $page.url);
	setSchoolStudentsState(studentsState);

	const classes = $derived(studentsState.classes);
	const hierarchy = $derived(studentsState.hierarchy);

	let view = $state<'table' | 'cards'>('table');

	const modals = createUrlSyncedModals({ allowed: ['create'], getUrl: () => $page.url });
	$effect(() => {
		modals.hydrate();
	});
	const createOpen = bindUrlModal(modals, 'create');

	const infinite = useOffsetInfiniteList(
		async (offset, limit) => {
			const result = await loadPeopleDataPage(getBrowserSchoolClient(), { offset, limit });
			detailDataContext.seedStudents(result.students);
			detailDataContext.seedGuardians(result.guardians);
			return { items: result.students, total: result.totalStudents };
		},
		SCHOOL_STUDENTS_INITIAL_PAGE_SIZE,
		() => `${studentsState.filters.values.class}|${studentsState.filters.values.status}|${studentsState.filters.values.q}`,
	);

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
		hierarchy.map(g => ({
			label: g.level,
			options: g.classes.map(c => ({
				value: c.id,
				label: `${c.name} · ${c.studentCount}`,
			})),
		})),
	);

	const filtered = $derived(studentsState.filterVisible(infinite.visible));

	function statusLabel(k: (typeof statusKeys)[number]) {
		return k === 'all' ? $t('filter.all') : $t(`studentStatus.${k}`);
	}

	$effect(() => {
		studentsState.hydrateFromUrl($page.url);
	});

	$effect(() => {
		if (!studentsState.filters.ready) {
			return;
		}
		void studentsState.filters.values.class;
		void studentsState.filters.values.status;
		studentsState.filters.scheduleSync();
	});

	const statusFilterActive = $derived(studentsState.filters.values.status !== 'all' ? 1 : 0);
	const statusFilterOptions = $derived(
		statusKeys.map(key => ({
			value: key,
			label: statusLabel(key),
		})),
	);
</script>

<div class="animate-fade-in">
	<ListPageHeader
		eyebrow={$t('students.schoolRoster')}
		title={$t('students.countLabel', { n: infinite.total })}
	>
		{#snippet search()}
			<ListSearchField
				bind:value={studentsState.filters.values.q}
				oninput={() => studentsState.filters.scheduleSync()}
				placeholder={$t('common.searchStudent')}
			/>
		{/snippet}
		{#snippet filters()}
			<FilterSelect
				bind:value={studentsState.filters.values.class}
				class="h-9 w-48 rounded-full text-xs"
				options={[{ value: 'all', label: $t('common.allClasses') }]}
				groups={classFilterGroups}
			/>
			<FilterPanel activeCount={statusFilterActive} title={$t('students.statusFilter')}>
				<FilterSelect
					bind:value={studentsState.filters.values.status}
					class="h-9 w-full rounded-md text-xs"
					options={statusFilterOptions}
				/>
			</FilterPanel>
		{/snippet}
		{#snippet more()}
			<ListMoreMenu {view} onViewChange={v => (view = v)} />
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
			aria-busy={infinite.loading}
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
				hasMore={infinite.hasMore}
				total={infinite.total}
				visibleCount={infinite.visible.length}
				loading={infinite.loading || infinite.loadingMore}
				onLoadMore={infinite.loadMore}
			>
				<ul class={cn(infinite.loading && 'opacity-60')}>
					{#each filtered as s (s.id)}
						{@const cls = classes.find(c => c.id === s.classId)}
						{@const active = selectedId === s.id}
						<li>
							<button
								type="button"
								onclick={() => onSelect?.(s)}
								class={cn(
									'grid w-full grid-cols-12 items-center gap-4 border-b border-border px-5 py-3.5 text-left transition-colors last:border-b-0',
									active ? 'bg-primary/10' : 'hover:bg-secondary',
								)}
							>
								<div class="col-span-4 flex items-center gap-3">
									<PersonAvatar
										name={s.name}
										initials={s.initials}
										photoUrl={s.photoUrl}
										size="list"
										class="h-9 w-9 text-xs"
									/>
									<div class="min-w-0">
										<p class="truncate text-sm font-medium">{s.name}</p>
										<p class="truncate text-xs text-muted-foreground">{s.email}</p>
									</div>
								</div>
								<div class="col-span-2 text-sm text-foreground/80">{cls?.name}</div>
								<div class="col-span-2 font-display text-base font-semibold tabular-nums">
									{s.average.toFixed(1)}
								</div>
								<div class="col-span-2">
									<div class="h-1.5 w-full overflow-hidden rounded-full bg-secondary">
										<div class="h-full rounded-full bg-accent" style:width="{s.attendance}%"></div>
									</div>
									<p class="mt-1 font-mono text-[10px] text-muted-foreground">{s.attendance}%</p>
								</div>
								<div class="col-span-2">
									<span
										class={cn(
											'rounded-full px-2 py-0.5 text-[10px] font-medium',
											statusStyle[s.status],
										)}
									>
										{$t(`studentStatus.${s.status}`)}
									</span>
								</div>
							</button>
						</li>
					{/each}
					{#if filtered.length === 0 && !infinite.loading}
						<li class="px-5 py-12 text-center text-sm text-muted-foreground">
							{$t('students.noMatch')}
						</li>
					{/if}
				</ul>
			</InfiniteList>
		</div>
	{:else}
		<div aria-busy={infinite.loading}>
			<InfiniteList
				hasMore={infinite.hasMore}
				total={infinite.total}
				visibleCount={infinite.visible.length}
				loading={infinite.loading || infinite.loadingMore}
				onLoadMore={infinite.loadMore}
			>
				<div class={cn('grid gap-3 sm:grid-cols-2 lg:grid-cols-3', infinite.loading && 'opacity-60')}>
					{#each filtered as s (s.id)}
						{@const cls = classes.find(c => c.id === s.classId)}
						{@const active = selectedId === s.id}
						<button
							type="button"
							onclick={() => onSelect?.(s)}
							class={cn(
								'rounded-2xl border border-border bg-card p-5 text-left shadow-soft transition hover:-translate-y-0.5 hover:shadow-panel',
								active && 'border-primary/40 bg-primary/5',
							)}
						>
							<div class="flex items-center gap-3">
								<PersonAvatar
									name={s.name}
									initials={s.initials}
									photoUrl={s.photoUrl}
									size="list"
								/>
								<div class="min-w-0">
									<p class="truncate font-medium">{s.name}</p>
									<p class="truncate text-xs text-muted-foreground">{cls?.name}</p>
								</div>
							</div>
							<div class="mt-4 flex items-center justify-between text-sm">
								<span class="font-display font-semibold tabular-nums">{s.average.toFixed(1)}</span>
								<span
									class={cn(
										'rounded-full px-2 py-0.5 text-[10px] font-medium',
										statusStyle[s.status],
									)}
								>
									{$t(`studentStatus.${s.status}`)}
								</span>
							</div>
						</button>
					{/each}
				</div>
				{#if filtered.length === 0 && !infinite.loading}
					<p class="py-12 text-center text-sm text-muted-foreground">{$t('students.noMatch')}</p>
				{/if}
			</InfiniteList>
		</div>
	{/if}
</div>
