<script lang="ts">
	import type { SchoolYearEvent } from '$lib/types/school';
	import { page } from '$app/stores';
	import { academicContext } from '$lib/academic/context.svelte';
	import Button from '$lib/components/ui/button/button.svelte';
	import Input from '$lib/components/ui/input/input.svelte';
	import ListPageHeader from '$lib/components/ui/ListPageHeader.svelte';
	import ListMoreMenu from '$lib/components/ui/ListMoreMenu.svelte';
	import PermissionGate from '$lib/components/ui/PermissionGate.svelte';
	import { detailDataContext } from '$lib/detail-data/context.svelte';
	import { detailHref } from '$lib/detail-hrefs';
	import { locale, t } from '$lib/i18n';
	import {
		CalendarDays,
		Plus,
		Search,
		Flag,
		Palmtree,
		AlertCircle,
		PartyPopper,
	} from '$lib/icons';
	import { readCalendarListFilters, writeCalendarListFilters } from '$lib/list/list-url-filters';
	import { appGoto } from '$lib/navigation/app-navigation';
	import { cn } from '$lib/utils';
	import SchoolYearEventFormModal from '../school-life/SchoolYearEventFormModal.svelte';

	const {
		onSelect,
		selectedId,
	}: {
		onSelect?: (e: SchoolYearEvent) => void;
		selectedId?: string;
	} = $props();

	const events = $derived(detailDataContext.schoolYearEvents);
	const classes = $derived(academicContext.classes);

	const typeConfig: Record<
		SchoolYearEvent['type'],
		{ labelKey: string; style: string; dot: string }
	> = {
		holiday: {
			labelKey: 'calType.holiday',
			style: 'bg-destructive/10 text-destructive',
			dot: 'bg-destructive',
		},
		vacation: {
			labelKey: 'calType.vacation',
			style: 'bg-secondary text-foreground/80',
			dot: 'bg-accent/60',
		},
		closure: {
			labelKey: 'calType.closure',
			style: 'bg-highlight-soft text-highlight',
			dot: 'bg-highlight',
		},
		ceremony: {
			labelKey: 'calType.ceremony',
			style: 'bg-secondary text-foreground/80',
			dot: 'bg-accent',
		},
	};

	const initialFilters = $derived(readCalendarListFilters($page.url));

	let q = $state('');
	let typeFilter = $state<'all' | SchoolYearEvent['type']>('all');
	let filtersReady = $state(false);
	let createOpen = $state(false);

	const typeFilterKeys = ['all', 'holiday', 'vacation', 'closure', 'ceremony'] as const;

	function formatMonthYear(dateStr: string, loc: string) {
		const d = new Date(dateStr);
		return d.toLocaleDateString(loc, { month: 'long', year: 'numeric' });
	}

	function typeLabel(k: (typeof typeFilterKeys)[number]) {
		return k === 'all' ? $t('filter.all') : $t(typeConfig[k].labelKey);
	}

	const filtered = $derived.by(() => {
		let list = events.slice().sort((a, b) => a.date.localeCompare(b.date));
		if (typeFilter !== 'all') {
			list = list.filter(e => e.type === typeFilter);
		}
		if (q.trim()) {
			const needle = q.toLowerCase();
			list = list.filter(
				e => e.title.toLowerCase().includes(needle) || e.description.toLowerCase().includes(needle),
			);
		}
		return list;
	});

	const grouped = $derived.by(() => {
		const map: Record<string, SchoolYearEvent[]> = {};
		for (const ev of filtered) {
			const key = formatMonthYear(ev.date, $locale);
			if (!map[key]) {
				map[key] = [];
			}
			map[key].push(ev);
		}
		return map;
	});

	function scopeLabel(scope: SchoolYearEvent['scope']) {
		if (scope === 'all') {
			return $t('cal.scopeAll');
		}
		return scope.map(id => classes.find(c => c.id === id)?.name ?? id).join(', ');
	}

	function handleCreated(eventId: string) {
		const path = detailHref.schoolCalendarEvent(eventId);
		appGoto(`${path}${$page.url.search}`);
	}

	function syncFiltersToUrl() {
		const href = writeCalendarListFilters($page.url, { q, type: typeFilter });
		appGoto(href, { replaceState: true, keepFocus: true, noScroll: true });
	}

	$effect(() => {
		const next = initialFilters;
		q = next.q;
		typeFilter = (typeFilterKeys.includes(next.type as (typeof typeFilterKeys)[number])
			? next.type
			: 'all') as typeof typeFilter;
		filtersReady = true;
	});

	let searchTimer: ReturnType<typeof setTimeout> | undefined;
	function scheduleFilterSync() {
		if (!filtersReady)
			return;
		clearTimeout(searchTimer);
		searchTimer = setTimeout(syncFiltersToUrl, 250);
	}

	function applyTypeFilter(next: (typeof typeFilterKeys)[number]) {
		typeFilter = next;
		scheduleFilterSync();
	}
</script>

<div class="animate-fade-in space-y-6">
	<ListPageHeader
		eyebrow={$t('calendar.year')}
		title={$t('calendar.eventCount', { n: filtered.length })}
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
				{#each typeFilterKeys as k (k)}
					<button
						type="button"
						onclick={() => applyTypeFilter(k)}
						class={cn(
							'rounded-full px-3 py-1 text-[11px] font-medium transition',
							typeFilter === k
								? 'bg-primary text-primary-foreground'
								: 'text-muted-foreground hover:text-foreground',
						)}
					>
						{typeLabel(k)}
					</button>
				{/each}
			</div>
		{/snippet}
		{#snippet primary()}
			<PermissionGate
				permission="TIMETABLE_UPDATE"
				mode="disable"
				tooltip={$t('calendar.permissionUpdate')}
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
						{$t('calendar.newEvent')}
					</Button>
				{/snippet}
			</PermissionGate>
		{/snippet}
		{#snippet more()}
			<ListMoreMenu exportOnly />
		{/snippet}
	</ListPageHeader>

	<SchoolYearEventFormModal bind:open={createOpen} onCreated={handleCreated} />

	<div class="space-y-8">
		{#each Object.entries(grouped) as [month, monthEvents] (month)}
			<div>
				<div class="mb-3 flex items-center gap-3">
					<div class="h-px flex-1 bg-border"></div>
					<span class="font-display text-sm font-semibold text-muted-foreground">{month}</span>
					<div class="h-px flex-1 bg-border"></div>
				</div>
				<div class="space-y-2.5">
					{#each monthEvents as ev (ev.id)}
						{@const cfg = typeConfig[ev.type]}
						{@const active = selectedId === ev.id}
						<button
							type="button"
							onclick={() => onSelect?.(ev)}
							class={cn(
								'group flex w-full items-start gap-4 rounded-2xl border border-border bg-card p-4 text-left shadow-soft transition hover:border-accent/40 hover:shadow-md',
								active && 'border-primary/40 bg-primary/5',
							)}
						>
							<div
								class="flex w-28 shrink-0 flex-col items-center justify-center rounded-xl bg-secondary/50 py-2"
							>
								<span class="font-display text-lg font-semibold leading-tight">
									{new Date(ev.date).getDate()}
								</span>
								<span class="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
									{new Date(ev.date).toLocaleDateString($locale, { month: 'short' })}
								</span>
								{#if ev.endDate}
									<span class="mt-0.5 font-mono text-[9px] text-muted-foreground">
										→ {new Date(ev.endDate).getDate()}
										{new Date(ev.endDate).toLocaleDateString($locale, { month: 'short' })}
									</span>
								{/if}
							</div>

							<div class="min-w-0 flex-1 space-y-1">
								<div class="flex items-center gap-2">
									<span
										class={cn(
											'flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium',
											cfg.style,
										)}
									>
										{#if ev.type === 'holiday'}
											<Flag class="h-3 w-3" />
										{:else if ev.type === 'vacation'}
											<Palmtree class="h-3 w-3" />
										{:else if ev.type === 'closure'}
											<AlertCircle class="h-3 w-3" />
										{:else}
											<PartyPopper class="h-3 w-3" />
										{/if}
										{$t(cfg.labelKey)}
									</span>
									<span class="font-mono text-[10px] text-muted-foreground">
										{scopeLabel(ev.scope)}
									</span>
								</div>
								<h3 class="font-display text-sm font-semibold">{ev.title}</h3>
								<p class="text-xs text-muted-foreground">{ev.description}</p>
							</div>

							<div class="mt-1 text-muted-foreground opacity-0 transition group-hover:opacity-100">
								<CalendarDays class="h-4 w-4" />
							</div>
						</button>
					{/each}
				</div>
			</div>
		{/each}
		{#if filtered.length === 0}
			<div class="py-12 text-center">
				<CalendarDays class="mx-auto h-8 w-8 text-muted-foreground/40" />
				<p class="mt-3 text-sm text-muted-foreground">{$t('calendar.noEvents')}</p>
			</div>
		{/if}
	</div>
</div>
