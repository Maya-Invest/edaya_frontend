<script lang="ts">
	import type { Guardian } from '$lib/types/school';
	import { page } from '$app/stores';
	import { DEFAULT_LIST_PAGE_SIZE } from '$lib/api/entity-list-filters';
	import { loadGuardiansPeopleDataPage } from '$lib/api/people-data';
	import { getBrowserSchoolClient } from '$lib/api/school-client';
	import Button from '$lib/components/ui/button/button.svelte';
	import InfiniteList from '$lib/components/ui/InfiniteList.svelte';
	import ListMoreMenu from '$lib/components/ui/ListMoreMenu.svelte';
	import ListPageHeader from '$lib/components/ui/ListPageHeader.svelte';
	import ListSearchField from '$lib/components/ui/ListSearchField.svelte';
	import PermissionGate from '$lib/components/ui/PermissionGate.svelte';
	import { detailDataContext } from '$lib/detail-data/context.svelte';
	import { detailHref } from '$lib/detail-hrefs';
	import { t } from '$lib/i18n';
	import { Mail, Phone, Plus, Users } from '$lib/icons';
	import { ListFiltersState } from '$lib/list/list-filters-state.svelte';
	import { readGuardianListFilters, writeGuardianListFilters } from '$lib/list/list-url-filters';
	import { useOffsetInfiniteList } from '$lib/list/use-infinite-list.svelte';
	import { bindUrlModal, createUrlSyncedModals } from '$lib/modal/modal-state.svelte';
	import { appGoto } from '$lib/navigation/app-navigation';
	import { cn } from '$lib/utils';
	import GuardianCreateModal from './GuardianCreateModal.svelte';

	const {
		onSelect,
		selectedId,
	}: {
		onSelect?: (g: Guardian) => void;
		selectedId?: string;
	} = $props();
	const students = $derived(detailDataContext.students);
	const initialFilters = $derived(readGuardianListFilters($page.url));

	const listFilters = new ListFiltersState<{ q: string }>(
		{
			getUrl: () => $page.url,
			write: writeGuardianListFilters,
			goto: href => appGoto(href, { replaceState: true, keepFocus: true, noScroll: true }),
		},
		() => readGuardianListFilters($page.url),
	);

	const modals = createUrlSyncedModals({ allowed: ['create'], getUrl: () => $page.url });
	$effect(() => {
		modals.hydrate();
	});
	const createOpen = bindUrlModal(modals, 'create');

	const infinite = useOffsetInfiniteList(
		async (offset, limit) => {
			const result = await loadGuardiansPeopleDataPage(getBrowserSchoolClient(), { offset, limit });
			detailDataContext.seedGuardians(result.guardians);
			detailDataContext.seedStudents(result.students);
			return { items: result.guardians, total: result.totalGuardians };
		},
		DEFAULT_LIST_PAGE_SIZE,
		() => listFilters.values.q,
	);
	const relationKey: Record<Guardian['relation'], string> = {
		'Mother': 'guardian.relation.Mother',
		'Father': 'guardian.relation.Father',
		'Legal guardian': 'guardian.relation.LegalGuardian',
	};
	const list = $derived(
		infinite.visible.filter(g => g.name.toLowerCase().includes(listFilters.values.q.toLowerCase())),
	);
	function handleCreated(guardianId: string) {
		appGoto(detailHref.schoolGuardian(guardianId));
	}
	$effect(() => {
		listFilters.hydrate(initialFilters);
	});
	$effect(() => {
		if (!listFilters.ready) {
			return;
		}
		void listFilters.values.q;
		listFilters.scheduleSync();
	});
</script>
<div class="animate-fade-in">
	<ListPageHeader
		eyebrow={$t('school.guardians')}
		title={$t('people.guardiansCount', { n: infinite.total })}
	>
		{#snippet search()}
			<ListSearchField bind:value={listFilters.values.q} oninput={() => listFilters.scheduleSync()} />
		{/snippet}
		{#snippet primary()}
			<PermissionGate
				permission="PARENT_CREATE"
				mode="disable"
				tooltip={$t('guardian.permissionCreate')}
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
						{$t('guardian.addGuardian')}
					</Button>
				{/snippet}
			</PermissionGate>
		{/snippet}
		{#snippet more()}
			<ListMoreMenu exportOnly />
		{/snippet}
	</ListPageHeader>
	<GuardianCreateModal bind:open={createOpen.open} onCreated={handleCreated} />
	<div
		class="overflow-hidden rounded-2xl border border-border bg-card shadow-soft"
		aria-busy={infinite.loading}
	>
		<div
			class="grid grid-cols-12 gap-4 border-b border-border bg-secondary/40 px-5 py-3 text-[11px] font-medium uppercase tracking-wider text-muted-foreground"
		>
			<div class="col-span-4">{$t('people.name')}</div>
			<div class="col-span-2">{$t('guardian.relationLabel')}</div>
			<div class="col-span-3">{$t('common.phone')}</div>
			<div class="col-span-2">{$t('students.student')}</div>
			<div class="col-span-1 text-right">·</div>
		</div>
		<InfiniteList
			hasMore={infinite.hasMore}
			total={infinite.total}
			visibleCount={infinite.visible.length}
			loading={infinite.loading || infinite.loadingMore}
			onLoadMore={infinite.loadMore}
		>
			<ul class={cn(infinite.loading && 'opacity-60')}>
				{#each list as g (g.id)}
					{@const active = selectedId === g.id}
					{@const linked = g.studentIds
						.map(id => students.find(s => s.id === id))
						.filter(Boolean) as typeof students}
					<li>
						<button
							type="button"
							onclick={() => onSelect?.(g)}
							class={cn(
								'grid w-full grid-cols-12 items-center gap-4 border-b border-border px-5 py-3.5 text-left transition-colors last:border-b-0',
								active ? 'bg-primary/10' : 'hover:bg-secondary',
							)}
						>
							<div class="col-span-4 flex items-center gap-3">
								<div
									class="flex h-9 w-9 items-center justify-center rounded-xl bg-primary font-display text-xs font-semibold text-primary-foreground"
								>
									{g.initials}
								</div>
								<div class="min-w-0">
									<p class="truncate text-sm font-medium">{g.name}</p>
									<p class="flex items-center gap-1 truncate text-xs text-muted-foreground">
										<Mail class="h-3 w-3" />
										{g.email}
									</p>
								</div>
							</div>
							<div class="col-span-2">
								<span
									class="rounded-full bg-secondary px-2 py-0.5 text-[10px] font-medium text-muted-foreground"
								>
									{$t(relationKey[g.relation])}
								</span>
							</div>
							<div class="col-span-3">
								<p class="flex items-center gap-1 text-xs text-muted-foreground">
									<Phone class="h-3 w-3" />
									{g.phone}
								</p>
							</div>
							<div class="col-span-2">
								{#if linked.length > 0}
									<div class="flex flex-wrap gap-1">
										{#each linked as s (s.id)}
											<span
												class="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] text-accent-foreground"
											>
												{s.name}
											</span>
										{/each}
									</div>
								{:else}
									<span class="text-xs text-muted-foreground">—</span>
								{/if}
							</div>
							<div class="col-span-1 flex justify-end">
								<Users class="h-4 w-4 text-muted-foreground" />
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
