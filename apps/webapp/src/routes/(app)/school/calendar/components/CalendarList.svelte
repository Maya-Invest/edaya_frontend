<script lang="ts">
	import type { SchoolYearEvent } from '$lib/types/school';
	import { page } from '$app/stores';
	import { academicContext } from '$lib/academic/context.svelte';
	import Button from '$lib/components/ui/button/button.svelte';
	import ConfirmModal from '$lib/components/ui/ConfirmModal.svelte';
	import FilterSelect from '$lib/components/ui/filter-select.svelte';
	import ListMoreMenu from '$lib/components/ui/ListMoreMenu.svelte';
	import ListPageHeader from '$lib/components/ui/ListPageHeader.svelte';
	import ListSearchField from '$lib/components/ui/ListSearchField.svelte';
	import PermissionGate from '$lib/components/ui/PermissionGate.svelte';
	import RowActionMenu from '$lib/components/ui/RowActionMenu.svelte';
	import RowActionMenuItem from '$lib/components/ui/RowActionMenuItem.svelte';
	import { parseCivilDate } from '$lib/date/format';
	import { locale, t } from '$lib/i18n';
	import {
		AlertCircle,
		CalendarDays,
		Flag,
		Palmtree,
		PartyPopper,
		Pencil,
		Plus,
		Trash2,
	} from '$lib/icons';
	import { exportMatchingList } from '$lib/list/list-csv-export';
	import { bindUrlModal, closeUrlModal, createUrlSyncedModals } from '$lib/modal/modal-state.svelte';
	import { cn } from '$lib/utils';
	import { get } from 'svelte/store';
	import { getCalendarPageState } from '../calendar-page.svelte';
	import { deleteCalendarEventOnPage } from '../lib/calendar-mutations';
	import CalendarEventFormModal from './CalendarEventFormModal.svelte';

	const calendarPage = getCalendarPageState();
	const events = $derived(calendarPage.events);
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
			style: 'bg-sky-soft text-sky',
			dot: 'bg-sky',
		},
		closure: {
			labelKey: 'calType.closure',
			style: 'bg-highlight-soft text-highlight',
			dot: 'bg-highlight',
		},
		ceremony: {
			labelKey: 'calType.ceremony',
			style: 'bg-primary/10 text-primary',
			dot: 'bg-primary',
		},
	};

	const modals = createUrlSyncedModals({
		allowed: ['create', 'edit', 'delete'],
		getUrl: () => $page.url,
	});
	$effect(() => {
		modals.hydrate();
	});
	const createOpen = bindUrlModal(modals, 'create');
	const editOpen = bindUrlModal(modals, 'edit');
	const deleteOpen = bindUrlModal(modals, 'delete');

	let deleteBusy = $state(false);

	const editingEvent = $derived(
		modals.active === 'edit' && modals.target ? calendarPage.findEvent(modals.target) ?? null : null,
	);
	const deleteTarget = $derived(
		modals.active === 'delete' && modals.target ? calendarPage.findEvent(modals.target) ?? null : null,
	);

	const typeFilterKeys = ['all', 'holiday', 'vacation', 'closure', 'ceremony'] as const;
	type TypeFilter = (typeof typeFilterKeys)[number];

	const typeFilter = $derived(
		typeFilterKeys.includes(calendarPage.filters.values.type as TypeFilter)
			? calendarPage.filters.values.type as TypeFilter
			: 'all',
	);

	function formatMonthYear(dateStr: string, loc: string) {
		return parseCivilDate(dateStr).toLocaleDateString(loc, { month: 'long', year: 'numeric' });
	}

	function eventEndDate(ev: SchoolYearEvent) {
		return ev.endDate ?? ev.date;
	}

	function isMultiDayEvent(ev: SchoolYearEvent) {
		return eventEndDate(ev) !== ev.date;
	}

	function typeLabel(k: (typeof typeFilterKeys)[number]) {
		return k === 'all' ? $t('filter.all') : $t(typeConfig[k].labelKey);
	}

	const filtered = $derived.by(() => {
		let list = events.slice().sort((a, b) => a.date.localeCompare(b.date));
		if (typeFilter !== 'all') {
			list = list.filter(e => e.type === typeFilter);
		}
		if (calendarPage.filters.values.q.trim()) {
			const needle = calendarPage.filters.values.q.toLowerCase();
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

	const typeFilterOptions = $derived(
		typeFilterKeys.map(key => ({
			value: key,
			label: typeLabel(key),
		})),
	);

	$effect(() => {
		if (!modals.ready) {
			return;
		}
		if (modals.active === 'create') {
			if (modals.target !== null) {
				modals.open('create');
			}
			return;
		}
		if (
			(modals.active === 'edit' && !editingEvent)
			|| (modals.active === 'delete' && !deleteTarget)
		) {
			modals.close();
		}
	});

	function openEdit(event: SchoolYearEvent) {
		modals.open('edit', { target: event.id });
	}

	function openDelete(event: SchoolYearEvent) {
		modals.open('delete', { target: event.id });
	}

	async function confirmDelete() {
		const target = deleteTarget;
		if (!target) {
			return;
		}
		deleteBusy = true;
		try {
			const ok = await deleteCalendarEventOnPage(calendarPage, target, {
				successMessage: get(t)('cal.toastDeleted', { title: target.title }),
			});
			if (ok) {
				deleteOpen.open = false;
			}
		}
		finally {
			deleteBusy = false;
		}
	}

</script>

<div class="animate-fade-in space-y-6">
	<ListPageHeader
		eyebrow={$t('calendar.year')}
		title={$t('calendar.eventCount', { n: filtered.length })}
	>
		{#snippet search()}
			<ListSearchField
				value={calendarPage.filters.values.q}
				oninput={(event) => {
					calendarPage.filters.patch({ q: event.currentTarget.value });
					calendarPage.filters.scheduleSync();
				}}
				placeholder={$t('common.search')}
			/>
		{/snippet}
		{#snippet filters()}
			<FilterSelect
				value={calendarPage.filters.values.type}
				class="h-9 min-w-[10rem] rounded-full text-xs"
				options={typeFilterOptions}
				onchange={value => calendarPage.filters.patchImmediate({ type: value })}
			/>
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
						onclick={() => modals.open('create')}
					>
						<Plus class="mr-1 h-4 w-4" />
						{$t('calendar.newEvent')}
					</Button>
				{/snippet}
			</PermissionGate>
		{/snippet}
		{#snippet more()}
			<ListMoreMenu
				exportOnly
				onExport={() => void exportMatchingList({
					filename: 'calendar.csv',
					headers: ['date', 'endDate', 'type', 'title', 'scope'],
					loadAll: async () => filtered.map(event => [
						event.date,
						event.endDate ?? event.date,
						event.type,
						event.title,
						scopeLabel(event.scope),
					]),
				})}
			/>
		{/snippet}
	</ListPageHeader>

	<CalendarEventFormModal bind:open={createOpen.open} onOpenChange={closeUrlModal(modals)} />
	<CalendarEventFormModal
		event={editingEvent ?? undefined}
		bind:open={editOpen.open}
		onOpenChange={closeUrlModal(modals)}
	/>

	<ConfirmModal
		bind:open={deleteOpen.open}
		title={$t('common.deleteConfirmTitle')}
		description={$t('cal.deleteConfirm', { title: deleteTarget?.title ?? '' })}
		confirmLabel={$t('common.delete')}
		cancelLabel={$t('common.cancel')}
		busy={deleteBusy}
		onConfirm={confirmDelete}
	/>

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
						{@const multiDay = isMultiDayEvent(ev)}
						<div
							class="group flex w-full items-start gap-4 rounded-2xl border border-border bg-card p-4 text-left shadow-soft"
						>
							<div
								class="flex w-28 shrink-0 flex-col items-center justify-center rounded-xl bg-secondary/50 py-2 text-center"
							>
								{#if multiDay}
									<span class="mb-1 font-sans tabular-nums text-[9px] uppercase tracking-wider text-muted-foreground">
										{$t('drawer.start')}
									</span>
								{/if}
								<span class="font-display text-lg font-semibold leading-tight">
									{parseCivilDate(ev.date).getDate()}
								</span>
								<span class="font-sans tabular-nums text-[10px] uppercase tracking-wider text-muted-foreground">
									{parseCivilDate(ev.date).toLocaleDateString($locale, { month: 'short' })}
								</span>
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
									<span class="font-sans tabular-nums text-[10px] text-muted-foreground">
										{scopeLabel(ev.scope)}
									</span>
								</div>
								<h3 class="font-display text-sm font-semibold">{ev.title}</h3>
								<p class="text-xs text-muted-foreground">{ev.description}</p>
							</div>

							<div class="flex shrink-0 items-start gap-2 self-start">
								{#if multiDay}
									{@const endDate = eventEndDate(ev)}
									<div
										class="flex w-28 flex-col items-center justify-center rounded-xl bg-secondary/50 py-2 text-center"
									>
										<span class="mb-1 font-sans tabular-nums text-[9px] uppercase tracking-wider text-muted-foreground">
											{$t('drawer.end')}
										</span>
										<span class="font-display text-lg font-semibold leading-tight">
											{parseCivilDate(endDate).getDate()}
										</span>
										<span class="font-sans tabular-nums text-[10px] uppercase tracking-wider text-muted-foreground">
											{parseCivilDate(endDate).toLocaleDateString($locale, { month: 'short' })}
										</span>
									</div>
								{/if}
								<div class="mt-1">
									<PermissionGate
										permission="TIMETABLE_UPDATE"
										mode="disable"
										tooltip={$t('calendar.permissionUpdate')}
									>
										{#snippet children({ disabled, title })}
											<RowActionMenu>
												<RowActionMenuItem
													{disabled}
													{title}
													onclick={() => openEdit(ev)}
												>
													<Pencil class="h-4 w-4 text-muted-foreground" />
													{$t('common.edit')}
												</RowActionMenuItem>
												<RowActionMenuItem
													destructive
													{disabled}
													{title}
													onclick={() => openDelete(ev)}
												>
													<Trash2 class="h-4 w-4" />
													{$t('common.delete')}
												</RowActionMenuItem>
											</RowActionMenu>
										{/snippet}
									</PermissionGate>
								</div>
							</div>
						</div>
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
