<script lang="ts">
	import type { Teacher } from '$lib/types/school';
	import { page } from '$app/stores';
	import { academicContext } from '$lib/academic/context.svelte';
	import { DEFAULT_LIST_PAGE_SIZE } from '$lib/api/entity-list-filters';
	import { getBrowserSchoolClient } from '$lib/api/school-client';
	import { fetchTeachersPage } from '$lib/api/teachers-data';
	import { authSession } from '$lib/auth/session.svelte';
	import Button from '$lib/components/ui/button/button.svelte';
	import InfiniteList from '$lib/components/ui/InfiniteList.svelte';
	import Input from '$lib/components/ui/input/input.svelte';
	import ListMoreMenu from '$lib/components/ui/ListMoreMenu.svelte';
	import ListPageHeader from '$lib/components/ui/ListPageHeader.svelte';
	import PermissionGate from '$lib/components/ui/PermissionGate.svelte';
	import { detailDataContext } from '$lib/detail-data/context.svelte';
	import { t } from '$lib/i18n';
	import { Mail, Phone, Plus, Search } from '$lib/icons';
	import { useOffsetInfiniteList } from '$lib/list/use-infinite-list.svelte';
	import { bindUrlModal, createUrlSyncedModals } from '$lib/modal/modal-state.svelte';
	import { setTeachersState, TeachersState } from '$lib/school/teachers-state.svelte';
	import { cn } from '$lib/utils';
	import PersonAvatar from '../shared/PersonAvatar.svelte';
	import TeacherCreateModal from './TeacherCreateModal.svelte';

	const {
		onSelect,
		selectedId,
	}: {
		onSelect?: (teacher: Teacher) => void;
		selectedId?: string;
	} = $props();

	const teachers = new TeachersState(() => $page.url);
	setTeachersState(teachers);

	const modals = createUrlSyncedModals({ allowed: ['create'], getUrl: () => $page.url });
	$effect(() => {
		modals.hydrate();
	});
	const createOpen = bindUrlModal(modals, 'create');

	const infinite = useOffsetInfiniteList(
		async (offset, limit) => {
			const result = await fetchTeachersPage(
				getBrowserSchoolClient(),
				{
					schoolId: authSession.schoolId ?? academicContext.schools[0]?.id ?? '',
					academicYearId: academicContext.yearId,
				},
				{ offset, limit },
			);
			detailDataContext.seedTeachers(result.teachers);
			detailDataContext.mergeTeacherAssignments(result.assignments);
			return { items: result.teachers, total: result.totalTeachers };
		},
		DEFAULT_LIST_PAGE_SIZE,
		() => teachers.filters.values.q,
	);

	const list = $derived(
		infinite.visible.filter(teacher =>
			teacher.name.toLowerCase().includes(teachers.filters.values.q.toLowerCase()),
		),
	);

	$effect(() => {
		teachers.hydrateFromUrl($page.url);
	});
</script>

<div class="animate-fade-in">
	<ListPageHeader
		eyebrow={$t('school.teachersDirectory')}
		title={$t('people.teachersCount', { n: infinite.total })}
	>
		{#snippet search()}
			<div class="relative">
				<Search
					class="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground"
				/>
				<Input
					bind:value={teachers.filters.values.q}
					oninput={() => teachers.filters.scheduleSync()}
					placeholder={$t('common.search')}
					class="h-9 w-56 rounded-full pl-9 text-sm"
				/>
			</div>
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
			<ListMoreMenu exportOnly />
		{/snippet}
	</ListPageHeader>

	<TeacherCreateModal bind:open={createOpen.open} onCreated={teachers.handleCreated} />

	<div
		class="overflow-hidden rounded-2xl border border-border bg-card shadow-soft"
		aria-busy={infinite.loading}
	>
		<div
			class="grid grid-cols-12 gap-4 border-b border-border bg-secondary/40 px-5 py-3 text-[11px] font-medium uppercase tracking-wider text-muted-foreground"
		>
			<div class="col-span-5">{$t('people.name')}</div>
			<div class="col-span-3">{$t('teacher.assignmentsColumn')}</div>
			<div class="col-span-4">{$t('common.status')}</div>
		</div>
		<InfiniteList
			hasMore={infinite.hasMore}
			total={infinite.total}
			visibleCount={infinite.visible.length}
			loading={infinite.loading || infinite.loadingMore}
			onLoadMore={infinite.loadMore}
		>
			<ul class={cn(infinite.loading && 'opacity-60')}>
				{#each list as teacher (teacher.id)}
					{@const active = selectedId === teacher.id}
					<li>
						<button
							type="button"
							onclick={() => onSelect?.(teacher)}
							class={cn(
								'grid w-full grid-cols-12 items-center gap-4 border-b border-border px-5 py-4 text-left transition-colors last:border-b-0',
								active ? 'bg-primary/10' : 'hover:bg-secondary',
								!teacher.isActive && 'opacity-60',
							)}
						>
							<div class="col-span-5 flex items-center gap-3">
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
								{$t('teacher.assignmentCount', { n: teachers.assignmentCount(teacher.id) })}
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
						</button>
					</li>
				{/each}
				{#if list.length === 0 && !infinite.loading}
					<li class="px-5 py-12 text-center text-sm text-muted-foreground">
						{$t('students.noMatch')}
					</li>
				{/if}
			</ul>
		</InfiniteList>
	</div>
</div>
