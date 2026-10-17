<script lang="ts">
	import type { Announcement, AnnouncementPriority, AnnouncementStatus } from '$lib/types/school';
	import { page } from '$app/stores';
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
	import { exportMatchingList } from '$lib/list/list-csv-export';
	import { useInfiniteList } from '$lib/list/use-infinite-list.svelte';
	import { bindUrlModal, createUrlSyncedModals } from '$lib/modal/modal-state.svelte';
	import { detailNavigationSearch } from '$lib/navigation/detail-navigation';
	import { currentRouteSurfaceHref, openDetailDrawer } from '$lib/navigation/route-surface-navigation';
	import { cn } from '$lib/utils';
	import { getAnnouncementsPageState } from '../announcements-page.svelte';
	import AnnouncementFormModal from './AnnouncementFormModal.svelte';

	const {
		onSelect,
		selectedId,
	}: {
		onSelect?: (announcement: Announcement) => void;
		selectedId?: string;
	} = $props();

	const announcementsPage = getAnnouncementsPageState();
	const announcements = $derived(announcementsPage.announcements);

	const statusTone: Record<AnnouncementStatus, string> = {
		draft: 'bg-secondary text-muted-foreground',
		published: 'bg-accent/20 text-foreground',
		archived: 'bg-muted text-muted-foreground',
	};

	const priorityTone: Record<AnnouncementPriority, string> = {
		normal: 'bg-secondary text-foreground/80',
		important: 'bg-highlight/15 text-foreground',
		urgent: 'bg-destructive/10 text-destructive',
	};

	const statusKeys = ['all', 'draft', 'published', 'archived'] as const;
	const priorityKeys = ['all', 'normal', 'important', 'urgent'] as const;

	let priority = $state<string>('all');

	const modals = createUrlSyncedModals({ allowed: ['create'], getUrl: () => $page.url });
	$effect(() => {
		modals.hydrate();
	});
	const createOpen = bindUrlModal(modals, 'create');

	const filtered = $derived(
		announcements
			.filter(announcement => announcementsPage.filters.values.status === 'all' || announcement.status === announcementsPage.filters.values.status)
			.filter(announcement => priority === 'all' || announcement.priority === priority)
			.filter((announcement) => {
				const needle = announcementsPage.filters.values.q.toLowerCase();
				return announcement.title.toLowerCase().includes(needle)
					|| announcement.content.toLowerCase().includes(needle);
			}),
	);

	const infinite = useInfiniteList(() => filtered, 30);

	function fmtDate(value: string | undefined) {
		if (!value) {
			return '—';
		}
		return new Date(value).toLocaleDateString('fr-FR', {
			day: '2-digit',
			month: 'short',
			year: 'numeric',
		});
	}

	function statusLabel(value: AnnouncementStatus) {
		return $t(`announcements.status.${value}`);
	}

	function priorityLabel(value: AnnouncementPriority) {
		return $t(`announcements.priority.${value}`);
	}

	function handleCreated(announcementId: string) {
		const path = detailHref.schoolAnnouncement(announcementId);
		openDetailDrawer(`${path}${detailNavigationSearch($page.url)}`, currentRouteSurfaceHref($page.url));
	}

	$effect(() => {
		if (!announcementsPage.filters.ready) {
			return;
		}
		void announcementsPage.filters.values.status;
		announcementsPage.filters.scheduleSync();
	});

	const statusFilterOptions = $derived(
		statusKeys.map(key => ({
			value: key,
			label: key === 'all' ? $t('filter.all') : statusLabel(key),
		})),
	);

	const priorityFilterActive = $derived(priority !== 'all' ? 1 : 0);

	const priorityFilterOptions = $derived(
		priorityKeys.map(key => ({
			value: key,
			label: key === 'all' ? $t('filter.all') : priorityLabel(key as AnnouncementPriority),
		})),
	);
</script>

<div class="animate-fade-in">
	<ListPageHeader
		eyebrow={$t('announcements.eyebrow')}
		title={$t('announcements.count', { n: filtered.length })}
	>
		{#snippet search()}
			<ListSearchField
				bind:value={announcementsPage.filters.values.q}
				oninput={() => announcementsPage.filters.scheduleSync()}
			/>
		{/snippet}
		{#snippet filters()}
			<FilterSelect
				bind:value={announcementsPage.filters.values.status}
				class="h-9 w-44 rounded-full text-xs"
				options={statusFilterOptions}
			/>
			<FilterPanel activeCount={priorityFilterActive} title={$t('announcements.priorityFilter')}>
				<FilterSelect
					bind:value={priority}
					class="h-9 w-full rounded-md text-xs"
					options={priorityFilterOptions}
				/>
			</FilterPanel>
		{/snippet}
		{#snippet primary()}
			<PermissionGate
				permission="COMMUNICATION_DRAFT_MANAGE"
				mode="disable"
				tooltip={$t('announcements.permissionCreate')}
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
						{$t('announcements.new')}
					</Button>
				{/snippet}
			</PermissionGate>
		{/snippet}
		{#snippet more()}
			<ListMoreMenu
				exportOnly
				onExport={() => void exportMatchingList({
					filename: 'announcements.csv',
					headers: ['title', 'status', 'date', 'targets'],
					loadAll: async () => filtered.map(announcement => [
						announcement.title,
						announcement.status,
						announcement.publishedAt ?? announcement.createdAt,
						announcement.targets.length,
					]),
				})}
			/>
		{/snippet}
	</ListPageHeader>

	{#if createOpen.open}
		<AnnouncementFormModal bind:open={createOpen.open} onCreated={handleCreated} />
	{/if}

	<div class="overflow-hidden rounded-2xl border border-border bg-card shadow-soft">
		<div
			class="grid grid-cols-[1.6fr_1fr_1fr_0.8fr] gap-4 border-b border-border bg-secondary/40 px-4 py-2.5 font-sans tabular-nums text-[10px] uppercase tracking-wider text-muted-foreground"
		>
			<span>{$t('announcements.titleLabel')}</span>
			<span>{$t('announcements.statusLabel')}</span>
			<span>{$t('announcements.dateLabel')}</span>
			<span class="text-right">{$t('announcements.targetsLabel')}</span>
		</div>
		<InfiniteList
			hasMore={infinite.hasMore}
			total={infinite.total}
			visibleCount={infinite.visible.length}
			onLoadMore={infinite.loadMore}
		>
			<ul class="divide-y divide-border">
				{#each infinite.visible as announcement (announcement.id)}
					{@const isSelected = announcement.id === selectedId}
					<li>
						<button
							type="button"
							onclick={() => onSelect?.(announcement)}
							class={cn(
								'grid w-full grid-cols-[1.6fr_1fr_1fr_0.8fr] items-center gap-4 px-4 py-3 text-left transition-colors hover:bg-secondary',
								isSelected && 'bg-primary/10',
							)}
						>
							<div class="min-w-0">
								<div class="flex flex-wrap items-center gap-2">
									<span
										class={cn(
											'rounded-full px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider',
											priorityTone[announcement.priority],
										)}
									>
										{priorityLabel(announcement.priority)}
									</span>
								</div>
								<p class="mt-1 truncate font-display text-sm font-semibold">{announcement.title}</p>
								<p class="line-clamp-1 text-xs text-muted-foreground">{announcement.content}</p>
							</div>
							<span
								class={cn(
									'inline-flex w-fit rounded-full px-2.5 py-0.5 text-[10px] font-medium uppercase tracking-wider',
									statusTone[announcement.status],
								)}
							>
								{statusLabel(announcement.status)}
							</span>
							<div class="flex items-center gap-1.5 text-xs text-foreground/80">
								<Mail class="h-3.5 w-3.5 text-muted-foreground" />
								<span class="font-sans tabular-nums">
									{fmtDate(announcement.publishedAt ?? announcement.createdAt)}
								</span>
							</div>
							<div class="text-right font-sans tabular-nums text-xs tabular-nums text-foreground/80">
								{announcement.targets.length}
							</div>
						</button>
					</li>
				{/each}
				{#if filtered.length === 0}
					<li class="px-4 py-12 text-center text-sm text-muted-foreground">
						{$t('announcements.none')}
					</li>
				{/if}
			</ul>
		</InfiniteList>
	</div>
</div>
