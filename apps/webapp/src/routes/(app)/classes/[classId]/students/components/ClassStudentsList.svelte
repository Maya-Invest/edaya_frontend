<script lang="ts">
	import type { Student } from '$lib/types/school';
	import { page } from '$app/stores';
	import PersonAvatar from '$lib/components/school/shared/PersonAvatar.svelte';
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
	import { Mail, Plus } from '$lib/icons';
	import { readClassStudentListFilters } from '$lib/list/list-url-filters';
	import { useInfiniteList } from '$lib/list/use-infinite-list.svelte';
	import { bindUrlModal, createUrlSyncedModals } from '$lib/modal/modal-state.svelte';
	import { appGoto } from '$lib/navigation/app-navigation';
	import { detailNavigationSearch } from '$lib/navigation/detail-navigation';
	import { cn } from '$lib/utils';
	import StudentCreateModal from '../../../../school/students/components/StudentCreateModal.svelte';
	import { getClassStudentsPageState } from '../class-students-page.svelte';

	const {
		classId,
		onSelect,
		selectedId,
	}: {
		classId: string;
		onSelect?: (student: Student) => void;
		selectedId?: string;
	} = $props();

	const classStudentsPage = getClassStudentsPageState();
	const currentClass = $derived(classStudentsPage.currentClass);
	const filtered = $derived(classStudentsPage.visibleStudents);
	const infinite = useInfiniteList(() => filtered, 30);

	const statusStyle: Record<Student['status'], string> = {
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
	const statusFilterOptions = $derived(
		statusKeys.map(key => ({
			value: key,
			label: key === 'all' ? $t('filter.all') : $t(`studentStatus.${key}`),
		})),
	);

	let view = $state<'table' | 'cards'>('table');

	const modals = createUrlSyncedModals({ allowed: ['create'], getUrl: () => $page.url });
	$effect(() => {
		modals.hydrate();
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
		appGoto(`${path}${detailNavigationSearch($page.url)}`);
	}
</script>

<div class="animate-fade-in">
	<ListPageHeader
		eyebrow={$t('students.roster')}
		title={$t('students.enrolled', { n: filtered.length })}
		description={currentClass ? `${currentClass.name}${currentClass.level ? ` · ${currentClass.level}` : ''}` : undefined}
	>
		{#snippet search()}
			<ListSearchField
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

	{#if createOpen.open}
		<StudentCreateModal
			bind:open={createOpen.open}
			hierarchy={classStudentsPage.hierarchy}
			defaultClassGroupId={classId}
			createStudent={input => classStudentsPage.createStudent(input)}
			onCreated={handleCreated}
		/>
	{/if}

	{#if view === 'table'}
		<div class="overflow-hidden rounded-2xl border border-border bg-card shadow-soft">
			<div
				class="grid grid-cols-12 gap-4 border-b border-border bg-secondary/40 px-5 py-3 text-[11px] font-medium uppercase tracking-wider text-muted-foreground"
			>
				<div class="col-span-5">{$t('students.student')}</div>
				<div class="col-span-2">{$t('students.average')}</div>
				<div class="col-span-2">{$t('students.attendance')}</div>
				<div class="col-span-3">{$t('students.status')}</div>
			</div>
			<InfiniteList
				hasMore={infinite.hasMore}
				total={infinite.total}
				visibleCount={infinite.visible.length}
				onLoadMore={infinite.loadMore}
			>
				<ul>
					{#each infinite.visible as student (student.id)}
						{@const active = selectedId === student.id}
						<li>
							<button
								type="button"
								onclick={() => onSelect?.(student)}
								class={cn(
									'grid w-full grid-cols-12 items-center gap-4 border-b border-border px-5 py-4 text-left transition-colors last:border-b-0',
									active ? 'bg-primary/10' : 'hover:bg-secondary',
								)}
							>
								<div class="col-span-5 flex items-center gap-3">
									<PersonAvatar
										name={student.name}
										initials={student.initials}
										photoUrl={student.photoUrl}
										size="list"
									/>
									<div class="min-w-0">
										<p class="truncate text-sm font-medium">{student.name}</p>
										<p class="flex items-center gap-1 truncate text-xs text-muted-foreground">
											<Mail class="h-3 w-3" />
											{student.email}
										</p>
									</div>
								</div>
								<div class="col-span-2">
									<p class="font-display text-lg font-semibold tabular-nums">{student.average.toFixed(1)}</p>
									<p class="text-[11px] text-muted-foreground">/ 20</p>
								</div>
								<div class="col-span-2">
									{#if student.attendance === null}
										<p class="font-mono text-[11px] text-muted-foreground">—</p>
									{:else}
										<div class="h-1.5 w-full overflow-hidden rounded-full bg-secondary">
											<div class="h-full rounded-full bg-accent" style:width="{student.attendance}%"></div>
										</div>
										<p class="mt-1 font-mono text-[11px] text-muted-foreground">{student.attendance}%</p>
									{/if}
								</div>
								<div class="col-span-3 flex flex-wrap items-center gap-1">
									<span
										class={cn(
											'rounded-full px-2.5 py-1 text-[11px] font-medium',
											statusStyle[student.status],
										)}
									>
										{$t(`studentStatus.${student.status}`)}
									</span>
									{#if student.academicBadge}
										<span
											class={cn(
												'rounded-full px-2.5 py-1 text-[11px] font-medium',
												badgeStyle[student.academicBadge],
											)}
										>
											{$t(`studentStatus.${student.academicBadge}`)}
										</span>
									{/if}
								</div>
							</button>
						</li>
					{/each}
					{#if filtered.length === 0}
						<li class="px-5 py-12 text-center text-sm text-muted-foreground">
							{$t('students.noMatch')}
						</li>
					{/if}
				</ul>
			</InfiniteList>
		</div>
	{:else}
		<InfiniteList
			hasMore={infinite.hasMore}
			total={infinite.total}
			visibleCount={infinite.visible.length}
			onLoadMore={infinite.loadMore}
		>
			<div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
				{#each infinite.visible as student (student.id)}
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
								<p class="truncate text-xs text-muted-foreground">{student.email}</p>
							</div>
						</div>
						<div class="mt-4 flex flex-wrap items-center justify-between gap-2 text-sm">
							<span class="font-display font-semibold tabular-nums">{student.average.toFixed(1)}</span>
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
						</div>
					</button>
				{/each}
			</div>
			{#if filtered.length === 0}
				<p class="py-12 text-center text-sm text-muted-foreground">{$t('students.noMatch')}</p>
			{/if}
		</InfiniteList>
	{/if}
</div>
