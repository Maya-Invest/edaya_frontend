<script lang="ts">
	import type { Student } from '$lib/types/school';
	import { page } from '$app/stores';
	import { academicContext } from '$lib/academic/context.svelte';
	import Button from '$lib/components/ui/button/button.svelte';
	import FilterSelect from '$lib/components/ui/filter-select.svelte';
	import FilterPanel from '$lib/components/ui/FilterPanel.svelte';
	import InfiniteList from '$lib/components/ui/InfiniteList.svelte';
	import Input from '$lib/components/ui/input/input.svelte';
	import ListMoreMenu from '$lib/components/ui/ListMoreMenu.svelte';
	import ListPageHeader from '$lib/components/ui/ListPageHeader.svelte';
	import PermissionGate from '$lib/components/ui/PermissionGate.svelte';
	import { detailDataContext } from '$lib/detail-data/context.svelte';
	import { detailHref } from '$lib/detail-hrefs';
	import { t } from '$lib/i18n';
	import { Mail, Plus, Search } from '$lib/icons';
	import { ListFiltersState } from '$lib/list/list-filters-state.svelte';
	import { readClassStudentListFilters, writeClassStudentListFilters } from '$lib/list/list-url-filters';
	import { useInfiniteList } from '$lib/list/use-infinite-list.svelte';
	import { bindUrlModal, createUrlSyncedModals } from '$lib/modal/modal-state.svelte';
	import { appGoto } from '$lib/navigation/app-navigation';
	import { detailNavigationSearch } from '$lib/navigation/detail-navigation';
	import { studentMatchesSearchQuery } from '$lib/students/matches-student-search-query';
	import { cn } from '$lib/utils';
	import PersonAvatar from '../shared/PersonAvatar.svelte';
	import StudentCreateModal from './StudentCreateModal.svelte';

	const {
		classId,
		onSelect,
		selectedId,
		className: classLabel,
		classLevel,
	}: {
		classId: string;
		onSelect?: (s: Student) => void;
		selectedId?: string;
		className?: string;
		classLevel?: string;
	} = $props();

	const students = $derived(detailDataContext.studentsForClass(classId));

	const statusStyle: Record<Student['status'], string> = {
		honor: 'bg-secondary text-foreground/80',
		active: 'bg-secondary text-foreground/70',
		warning: 'bg-highlight-soft text-highlight',
	};

	const initialFilters = $derived(readClassStudentListFilters($page.url));

	const listFilters = new ListFiltersState<{ q: string; status: string }>(
		{
			getUrl: () => $page.url,
			write: writeClassStudentListFilters,
			goto: href => appGoto(href, { replaceState: true, keepFocus: true, noScroll: true }),
		},
		() => readClassStudentListFilters($page.url),
	);

	let view = $state<'table' | 'cards'>('table');

	const modals = createUrlSyncedModals({ allowed: ['create'], getUrl: () => $page.url });
	$effect(() => {
		modals.hydrate();
	});
	const createOpen = bindUrlModal(modals, 'create');

	const statusKeys = ['all', 'honor', 'active', 'warning'] as const;

	const filtered = $derived(
		students
			.filter(s => listFilters.values.status === 'all' || s.status === listFilters.values.status)
			.filter(s => studentMatchesSearchQuery(s, listFilters.values.q)),
	);

	const infinite = useInfiniteList(() => filtered, 30);

	function statusLabel(k: (typeof statusKeys)[number]) {
		return k === 'all' ? $t('filter.all') : $t(`studentStatus.${k}`);
	}

	const statusFilterActive = $derived(listFilters.values.status !== 'all' ? 1 : 0);
	const statusFilterOptions = $derived(
		statusKeys.map(key => ({
			value: key,
			label: statusLabel(key),
		})),
	);

	function handleCreated(studentId: string) {
		const path = detailHref.classStudent(classId, studentId);
		appGoto(`${path}${detailNavigationSearch($page.url)}`);
	}

	$effect(() => {
		listFilters.hydrate(initialFilters);
	});

	$effect(() => {
		if (!listFilters.ready) {
			return;
		}
		void listFilters.values.status;
		void listFilters.values.q;
		listFilters.scheduleSync();
	});
</script>

<div class="animate-fade-in">
	<ListPageHeader
		eyebrow={$t('students.roster')}
		title={$t('students.enrolled', { n: filtered.length })}
		description={classLabel ? `${classLabel}${classLevel ? ` · ${classLevel}` : ''}` : undefined}
	>
		{#snippet search()}
			<div class="relative">
				<Search
					class="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground"
				/>
				<Input
					bind:value={listFilters.values.q}
					oninput={() => listFilters.scheduleSync()}
					placeholder={$t('common.searchStudent')}
					class="h-9 w-56 rounded-full pl-9 text-sm"
				/>
			</div>
		{/snippet}
		{#snippet filters()}
			<FilterPanel activeCount={statusFilterActive} title={$t('students.statusFilter')}>
				<FilterSelect
					bind:value={listFilters.values.status}
					class="h-9 w-full rounded-md text-xs"
					options={statusFilterOptions}
					onchange={() => listFilters.scheduleSync()}
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

	{#if createOpen.open}
		<StudentCreateModal
			bind:open={createOpen.open}
			hierarchy={academicContext.hierarchy}
			defaultClassGroupId={classId}
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
					{#each infinite.visible as s (s.id)}
						{@const active = selectedId === s.id}
						<li>
							<button
								type="button"
								onclick={() => onSelect?.(s)}
								class={cn(
									'grid w-full grid-cols-12 items-center gap-4 border-b border-border px-5 py-4 text-left transition-colors last:border-b-0',
									active ? 'bg-primary/10' : 'hover:bg-secondary',
								)}
							>
								<div class="col-span-5 flex items-center gap-3">
									<PersonAvatar
										name={s.name}
										initials={s.initials}
										photoUrl={s.photoUrl}
										size="list"
									/>
									<div class="min-w-0">
										<p class="truncate text-sm font-medium">{s.name}</p>
										<p class="flex items-center gap-1 truncate text-xs text-muted-foreground">
											<Mail class="h-3 w-3" />
											{s.email}
										</p>
									</div>
								</div>
								<div class="col-span-2">
									<p class="font-display text-lg font-semibold tabular-nums">{s.average.toFixed(1)}</p>
									<p class="text-[11px] text-muted-foreground">/ 20</p>
								</div>
								<div class="col-span-2">
									<div class="h-1.5 w-full overflow-hidden rounded-full bg-secondary">
										<div class="h-full rounded-full bg-accent" style:width="{s.attendance}%"></div>
									</div>
									<p class="mt-1 font-mono text-[11px] text-muted-foreground">{s.attendance}%</p>
								</div>
								<div class="col-span-3">
									<span
										class={cn(
											'rounded-full px-2.5 py-1 text-[11px] font-medium',
											statusStyle[s.status],
										)}
									>
										{$t(`studentStatus.${s.status}`)}
									</span>
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
				{#each infinite.visible as s (s.id)}
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
								<p class="truncate text-xs text-muted-foreground">{s.email}</p>
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
			{#if filtered.length === 0}
				<p class="py-12 text-center text-sm text-muted-foreground">{$t('students.noMatch')}</p>
			{/if}
		</InfiniteList>
	{/if}
</div>
