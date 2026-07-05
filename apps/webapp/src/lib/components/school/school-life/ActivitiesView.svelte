<script lang="ts">
	import type { Activity } from '$lib/types/school';
	import { page } from '$app/stores';
	import Button from '$lib/components/ui/button/button.svelte';
	import InfiniteList from '$lib/components/ui/InfiniteList.svelte';
	import Input from '$lib/components/ui/input/input.svelte';
	import ListPageHeader from '$lib/components/ui/ListPageHeader.svelte';
	import ListMoreMenu from '$lib/components/ui/ListMoreMenu.svelte';
	import PermissionGate from '$lib/components/ui/PermissionGate.svelte';
	import { detailDataContext } from '$lib/detail-data/context.svelte';
	import { detailHref } from '$lib/detail-hrefs';
	import { t } from '$lib/i18n';
	import { CalendarRange, Plus, Search, Users } from '$lib/icons';
	import { readActivityListFilters, writeActivityListFilters } from '$lib/list/list-url-filters';
	import { useInfiniteList } from '$lib/list/use-infinite-list.svelte';
	import { appGoto } from '$lib/navigation/app-navigation';
	import { cn } from '$lib/utils';
	import ActivityFormModal from './ActivityFormModal.svelte';

	const {
		onSelect,
		selectedId,
	}: {
		onSelect?: (a: Activity) => void;
		selectedId?: string;
	} = $props();

	const activities = $derived(detailDataContext.activities);

	const catTone: Record<Activity['category'], string> = {
		Sport: 'bg-secondary text-foreground/80',
		Arts: 'bg-secondary text-foreground/80',
		Science: 'bg-secondary text-foreground/80',
		Language: 'bg-secondary text-foreground/80',
		Wellbeing: 'bg-secondary text-foreground/80',
	};

	const categoryKeys = ['all', 'Sport', 'Arts', 'Science', 'Language', 'Wellbeing'] as const;

	const initialFilters = $derived(readActivityListFilters($page.url));

	let q = $state('');
	let category = $state<string>('all');
	let filtersReady = $state(false);
	let createOpen = $state(false);

	const filtered = $derived(
		activities
			.filter(a => category === 'all' || a.category === category)
			.filter((a) => {
				const needle = q.toLowerCase();
				return a.name.toLowerCase().includes(needle)
					|| a.coach.toLowerCase().includes(needle)
					|| a.description.toLowerCase().includes(needle);
			}),
	);

	const infinite = useInfiniteList(() => filtered, 30);

	function fmtDate(d: string) {
		return new Date(d).toLocaleDateString('fr-FR', {
			day: '2-digit',
			month: 'short',
			year: 'numeric',
		});
	}

	function categoryLabel(k: (typeof categoryKeys)[number]) {
		return k === 'all' ? $t('filter.all') : $t(`activities.cat.${k}`);
	}

	function handleCreated(activityId: string) {
		const path = detailHref.schoolActivity(activityId);
		appGoto(`${path}${$page.url.search}`);
	}

	function syncFiltersToUrl() {
		const href = writeActivityListFilters($page.url, { q, category });
		appGoto(href, { replaceState: true, keepFocus: true, noScroll: true });
	}

	$effect(() => {
		const next = initialFilters;
		q = next.q;
		category = next.category;
		filtersReady = true;
	});

	let searchTimer: ReturnType<typeof setTimeout> | undefined;
	function scheduleFilterSync() {
		if (!filtersReady)
			return;
		clearTimeout(searchTimer);
		searchTimer = setTimeout(syncFiltersToUrl, 250);
	}

	function applyCategory(next: (typeof categoryKeys)[number]) {
		category = next;
		scheduleFilterSync();
	}
</script>

<div class="animate-fade-in">
	<ListPageHeader
		eyebrow={$t('activities.eyebrow')}
		title={$t('activities.count', { n: filtered.length })}
	>
		{#snippet search()}
			<div class="relative">
				<Search
					class="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground"
				/>
				<Input
					bind:value={q}
					oninput={scheduleFilterSync}
					placeholder={$t('common.search')}
					class="h-9 w-56 rounded-full pl-9 text-sm"
				/>
			</div>
		{/snippet}
		{#snippet filters()}
			<div class="flex flex-wrap items-center gap-1 rounded-full border border-border bg-card p-1 shadow-soft">
				{#each categoryKeys as k (k)}
					<button
						type="button"
						onclick={() => applyCategory(k)}
						class={cn(
							'rounded-full px-3 py-1 text-[11px] font-medium transition',
							category === k
								? 'bg-primary text-primary-foreground'
								: 'text-muted-foreground hover:text-foreground',
						)}
					>
						{categoryLabel(k)}
					</button>
				{/each}
			</div>
		{/snippet}
		{#snippet primary()}
			<PermissionGate
				permission="DISCIPLINE_CREATE"
				mode="disable"
				tooltip={$t('activities.permissionCreate')}
			>
				{#snippet children({ disabled, title })}
					<Button
						size="sm"
						class="rounded-full"
						{disabled}
						{title}
						onclick={() => (createOpen = true)}
					>
						<Plus class="mr-1 h-4 w-4" />
						{$t('activities.newActivity')}
					</Button>
				{/snippet}
			</PermissionGate>
		{/snippet}
		{#snippet more()}
			<ListMoreMenu exportOnly />
		{/snippet}
	</ListPageHeader>

	<ActivityFormModal bind:open={createOpen} onCreated={handleCreated} />

	<div class="overflow-hidden rounded-2xl border border-border bg-card shadow-soft">
		<div
			class="grid grid-cols-[1.6fr_2fr_1.2fr_0.6fr] gap-4 border-b border-border bg-secondary/40 px-4 py-2.5 font-mono text-[10px] uppercase tracking-wider text-muted-foreground"
		>
			<span>{$t('activities.name')}</span>
			<span>{$t('activities.description')}</span>
			<span>{$t('activities.period')}</span>
			<span class="text-right">{$t('activities.enrolled')}</span>
		</div>
		<InfiniteList
			hasMore={infinite.hasMore}
			total={infinite.total}
			visibleCount={infinite.visible.length}
			onLoadMore={infinite.loadMore}
		>
			<ul class="divide-y divide-border">
				{#each infinite.visible as a (a.id)}
					{@const isSelected = a.id === selectedId}
					<li>
						<button
							type="button"
							onclick={() => onSelect?.(a)}
							class={cn(
								'grid w-full grid-cols-[1.6fr_2fr_1.2fr_0.6fr] items-center gap-4 px-4 py-3 text-left transition-colors hover:bg-secondary',
								isSelected && 'bg-primary/10',
							)}
						>
							<div class="min-w-0">
								<div class="flex items-center gap-2">
									<span
										class={cn(
											'rounded-full px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider',
											catTone[a.category],
										)}
									>
										{$t(`activities.cat.${a.category}`)}
									</span>
								</div>
								<p class="mt-1 truncate font-display text-sm font-semibold">{a.name}</p>
								<p class="truncate text-xs text-muted-foreground">{a.coach} · {a.schedule}</p>
							</div>
							<p class="line-clamp-2 text-xs text-muted-foreground">{a.description}</p>
							<div class="flex items-center gap-1.5 text-xs text-foreground/80">
								<CalendarRange class="h-3.5 w-3.5 text-muted-foreground" />
								<span class="font-mono tabular-nums"
								>{fmtDate(a.startDate)} → {fmtDate(a.endDate)}</span
								>
							</div>
							<div class="flex items-center justify-end gap-1 text-xs">
								<Users class="h-3.5 w-3.5 text-muted-foreground" />
								<span class="font-mono tabular-nums">{a.enrollments.length}/{a.capacity}</span>
							</div>
						</button>
					</li>
				{/each}
				{#if filtered.length === 0}
					<li class="px-4 py-12 text-center text-sm text-muted-foreground">
						{$t('activities.none')}
					</li>
				{/if}
			</ul>
		</InfiniteList>
	</div>
</div>
