<script lang="ts">
	import type { PeriodDefinition } from '$lib/types/school';
	import type { CalendarInstanceApi, EventCss } from '@svar-ui/svelte-calendar';
	import type { PeriodCalendarChanges, PeriodCalendarResult, PeriodDayGroup } from './period-calendar';
	import { browser } from '$app/environment';
	import SvarCalendarLocale from '$lib/components/calendar/SvarCalendarLocale.svelte';
	import Checkbox from '$lib/components/ui/checkbox/checkbox.svelte';
	import { lang, t } from '$lib/i18n';

	import { Calendar, Willow } from '@svar-ui/svelte-calendar';
	import { onDestroy } from 'svelte';
	import { isEmptyWeekend, periodCalendarCreation, periodCalendarDate, periodCalendarEvent, snapPeriodCalendarChange } from './period-calendar';
	import { setPeriodCalendarActions } from './period-calendar-context';
	import { PERIOD_DEFINITION_WEEKDAY_LABEL_KEY } from './period-definition-presets';

	import PeriodCalendarEvent from './PeriodCalendarEvent.svelte';

	const { groups, mode = 'readonly', selectedIds = [], busy = false, onSelectionChange, onEdit, onDelete, onCreate, onUpdate }: {
		groups: PeriodDayGroup[];
		mode?: 'edit' | 'readonly' | 'select';
		selectedIds?: string[];
		busy?: boolean;
		onSelectionChange?: (ids: string[]) => void;
		onEdit?: (def: PeriodDefinition) => void;
		onDelete?: (def: PeriodDefinition) => void;
		onCreate?: (values: PeriodCalendarChanges) => void;
		onUpdate?: (id: string, change: Record<string, unknown>) => void;
	} = $props();
	let showEmptyWeekends = $state(false);
	let selectedId = $state('');

	let result = $state<PeriodCalendarResult | null>(null);
	const failed = $derived(result !== null && !result.ok);
	const message = $derived(busy ? $t('periodDefinitions.calendarSaving') : result === null ? '' : result.ok ? $t('periodDefinitions.calendarSaved') : $t(`periodDefinitions.resize.${result.error}`, { label: result.conflict ?? '' }));
	let disposed = false;
	onDestroy(() => {
		disposed = true;
	});
	const editable = $derived(mode === 'edit');
	const definitions = $derived(groups.flatMap(group => group.defs));
	const visibleGroups = $derived(groups.filter(group => showEmptyWeekends || !isEmptyWeekend(group)));
	const events = $derived(definitions.map(periodCalendarEvent));
	const startHour = $derived(Math.max(0, Math.min(mode === 'select' && events.length ? 24 : 7, ...events.map(event => event.start.getHours()))));
	const endHour = $derived(Math.min(24, Math.max(mode === 'select' && events.length ? 0 : 17, ...events.map(event => Math.ceil((event.end.getHours() * 60 + event.end.getMinutes()) / 60)))));
	const weekView = $derived({
		id: 'week',
		sections: {
			multiday: { filter: () => false },
			timeGrid: {
				xScale: {
					type: 'unit',
					items: visibleGroups.map(group => ({ id: group.dayOfWeek, label: $t(PERIOD_DEFINITION_WEEKDAY_LABEL_KEY[group.dayOfWeek]) })),
					accessor: 'dayOfWeek',
				},
				yScale: { type: 'time', startHour, endHour, step: 30, snapStep: 5, ui: { minUnitHeight: mode === 'select'
					? Math.max(48, ...definitions.filter(d => !d.isBreak && d.isTeachingSlot).map((d) => {
						const minutes = (v: string) => Number(v.slice(0, 2)) * 60 + Number(v.slice(3));
						return 45 * 30 / Math.max(1, minutes(d.endTime) - minutes(d.startTime));
					}))
					: 48 }, format: '%H:%i' },
				ui: { dragCreate: editable, nowLine: false },
			},
		},
	});
	const eventCss: EventCss = ({ event }) => event.isBreak ? 'period-calendar-break' : selectedIds.includes(String(event.id)) && mode === 'select' ? 'period-calendar-preferred' : 'period-calendar-slot';

	function updateSlot(id: string, change: Record<string, unknown>) {
		onUpdate?.(id, change);
	}

	setPeriodCalendarActions({
		get selectedId() { return selectedId; },
		get mode() { return mode; },
		get selectedIds() { return selectedIds; },
		toggle(id) {
			if (busy || mode !== 'select')
				return;
			onSelectionChange?.(selectedIds.includes(id) ? selectedIds.filter(value => value !== id) : [...selectedIds, id]);
		},
		get editable() { return editable; },
		get busy() { return busy; },
		edit(id) {
			const definition = definitions.find(item => item.id === id);
			if (!editable || busy || !definition)
				return;
			selectedId = id;
			onEdit?.(definition);
		},
		resize(id, end) {
			if (editable && !busy && !disposed)
				void updateSlot(id, { end });
		},
		remove(id) {
			const definition = definitions.find(item => item.id === id);
			if (!editable || busy || !definition)
				return;
			selectedId = id;
			onDelete?.(definition);
		},
	});

	function initCalendar(api: CalendarInstanceApi) {
		api.intercept('update-event', (payload) => {
			if (editable && !busy && !disposed && payload && typeof payload === 'object' && 'id' in payload && 'event' in payload
				&& payload.event && typeof payload.event === 'object') {
				void updateSlot(String(payload.id), snapPeriodCalendarChange(payload.event));
			}
			return false;
		});
		// Existing route modals own creation and deletion; vendor UI never writes.
		api.intercept('delete-event', () => false);
		api.intercept('add-event', (payload) => {
			if (editable && !busy && !disposed && payload && typeof payload === 'object' && 'event' in payload
				&& payload.event && typeof payload.event === 'object') {
				const checked = periodCalendarCreation(payload.event, definitions);
				result = checked.ok ? null : checked;
				if (checked.ok)
					onCreate?.(checked.values);
			}
			return false;
		});
		api.intercept('select-event', (payload) => {
			if (payload && typeof payload === 'object' && 'id' in payload && payload.id != null)
				selectedId = String(payload.id);
			return false;
		});
	}
</script>

<div class:selection-calendar={mode === 'select'} class="mt-3 flex flex-col gap-2">
	<div class="flex flex-wrap items-center justify-between gap-x-4 gap-y-1">
		<p class="min-w-0 flex-1 basis-72 text-sm text-muted-foreground" hidden={mode === 'select'}>{$t('periodDefinitions.calendarHint')}</p>
		{#if groups.some(isEmptyWeekend)}
			<label class="flex min-h-11 shrink-0 cursor-pointer items-center gap-2 text-sm"><Checkbox bind:checked={showEmptyWeekends} disabled={busy} />{$t('periodDefinitions.showEmptyWeekends')}</label>
		{/if}
	</div>
	<p role="status" aria-live="polite" class={failed ? 'text-sm text-destructive' : 'sr-only'}>{message}</p>
	{#if browser}
		<!-- svelte-ignore a11y_no_noninteractive_tabindex (Keyboard focus enables horizontal scrolling on narrow screens.) -->
		<div role="region" aria-label={$t('periodDefinitions.sectionTitle')} tabindex="0" class="overflow-x-auto rounded-collection border border-border bg-card focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary">
			<div class="period-calendar min-w-[760px]" class:selection-viewport={mode === 'select'} data-testid="period-calendar" aria-busy={busy}>
				{#key `${$lang}-${visibleGroups.map(group => group.dayOfWeek).join(',')}`}
					<SvarCalendarLocale lang={$lang} weekStart={1}>
						<Willow fonts={false}>
							<Calendar {events} date={periodCalendarDate()} view="week" views={[weekView]} toolbar={null} readonly={!editable || busy} init={initCalendar} {eventCss} eventContent={PeriodCalendarEvent} />
						</Willow>
					</SvarCalendarLocale>
				{/key}
			</div>
		</div>
	{/if}
</div>

<style>
 .period-calendar { height:640px; }
 .selection-viewport { height:320px; }
 @container(min-width:768px) {
  @media(min-height:700px) {
   .selection-calendar { flex:1; min-height:0; }
   .selection-calendar > [role="region"] { flex:1; min-height:0; }
   .selection-viewport { height:100%; min-height:240px; }
  }
 }

 :global(.period-calendar .wx-box-event.period-calendar-preferred) { background:hsl(var(--primary) / .18); color:hsl(var(--foreground)); border:2px solid hsl(var(--primary)); }
	:global(.period-calendar .wx-willow-theme) {
		--wx-color-primary: hsl(var(--primary));
		--wx-color-primary-font: hsl(var(--primary-foreground));
		--wx-color-font: hsl(var(--foreground));
		--wx-color-font-alt: hsl(var(--muted-foreground));
		--wx-background: hsl(var(--card));
		--wx-background-alt: hsl(var(--secondary));
		--wx-background-hover: hsl(var(--secondary));
		--wx-border: 1px solid hsl(var(--border));
		--wx-font-family: var(--font-sans);
		--wx-calendar-grid-color: hsl(var(--border));
		height: 100%;
	}
	:global(.period-calendar .wx-box-event.period-calendar-slot) {
		background: hsl(var(--primary) / 0.08);
		color: hsl(var(--foreground));
		border: 1px solid hsl(var(--primary) / 0.25);
		box-shadow: none;
	}
	:global(.period-calendar .wx-box-event.period-calendar-break) {
		background: hsl(var(--secondary) / 0.6);
		color: hsl(var(--muted-foreground));
		border: 1px solid hsl(var(--border));
		box-shadow: none;
	}
</style>
