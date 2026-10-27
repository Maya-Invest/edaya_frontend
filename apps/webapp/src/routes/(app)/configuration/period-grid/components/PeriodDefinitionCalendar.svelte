<script lang="ts">
	import type { PeriodDefinition } from '$lib/types/school';
	import type { CalendarInstanceApi, EventCss } from '@svar-ui/svelte-calendar';
	import type { PeriodCalendarChanges, PeriodCalendarResult, PeriodDayGroup } from '../lib/period-calendar';
	import { browser } from '$app/environment';
	import SvarCalendarLocale from '$lib/components/calendar/SvarCalendarLocale.svelte';
	import Checkbox from '$lib/components/ui/checkbox/checkbox.svelte';
	import { lang, t } from '$lib/i18n';
	import { hasPermission } from '$lib/permissions';
	import { Calendar, Willow } from '@svar-ui/svelte-calendar';
	import { onDestroy } from 'svelte';
	import { isEmptyWeekend, periodCalendarCreation, periodCalendarDate, periodCalendarEvent, snapPeriodCalendarChange } from '../lib/period-calendar';
	import { setPeriodCalendarActions } from '../lib/period-calendar-context';
	import { PERIOD_DEFINITION_WEEKDAY_LABEL_KEY } from '../lib/period-definition-presets';
	import { getPeriodGridPageState } from '../period-grid-page.svelte';
	import PeriodCalendarEvent from './PeriodCalendarEvent.svelte';

	const { groups, onEdit, onDelete, onCreate }: {
		groups: PeriodDayGroup[];
		onCreate: (values: PeriodCalendarChanges) => void;
		onEdit: (def: PeriodDefinition) => void;
		onDelete: (def: PeriodDefinition) => void;
	} = $props();
	const periodGridPage = getPeriodGridPageState();
	let showEmptyWeekends = $state(false);
	let selectedId = $state('');
	let busy = $state(false);
	let result = $state<PeriodCalendarResult | null>(null);
	const failed = $derived(result !== null && !result.ok);
	const message = $derived(busy ? $t('periodDefinitions.calendarSaving') : result === null ? '' : result.ok ? $t('periodDefinitions.calendarSaved') : $t(`periodDefinitions.resize.${result.error}`, { label: result.conflict ?? '' }));
	let disposed = false;
	onDestroy(() => {
		disposed = true;
	});
	const editable = $derived(hasPermission('SCHOOL_CONFIGURE'));
	const definitions = $derived(groups.flatMap(group => group.defs));
	const visibleGroups = $derived(groups.filter(group => showEmptyWeekends || !isEmptyWeekend(group)));
	const events = $derived(definitions.map(periodCalendarEvent));
	const startHour = $derived(Math.max(0, Math.min(7, ...events.map(event => event.start.getHours()))));
	const endHour = $derived(Math.min(24, Math.max(17, ...events.map(event => Math.ceil((event.end.getHours() * 60 + event.end.getMinutes()) / 60)))));
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
				yScale: { type: 'time', startHour, endHour, step: 30, snapStep: 5, ui: { minUnitHeight: 48 }, format: '%H:%i' },
				ui: { dragCreate: true, nowLine: false },
			},
		},
	});
	const eventCss: EventCss = ({ event }) => event.isBreak ? 'period-calendar-break' : 'period-calendar-slot';

	async function updateSlot(id: string, change: Record<string, unknown>) {
		if (busy)
			return;
		selectedId = id;
		busy = true;
		result = null;
		try {
			const response = await periodGridPage.calendarWriter.update(id, change);
			if (disposed)
				return;
			result = response;
		}
		finally {
			if (!disposed)
				busy = false;
		}
	}

	setPeriodCalendarActions({
		get selectedId() { return selectedId; },
		get editable() { return editable; },
		get busy() { return busy; },
		edit(id) {
			const definition = definitions.find(item => item.id === id);
			if (!editable || busy || !definition)
				return;
			selectedId = id;
			onEdit(definition);
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
			onDelete(definition);
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
					onCreate(checked.values);
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

<div class="mt-3 flex flex-col gap-2">
	<div class="flex flex-wrap items-center justify-between gap-x-4 gap-y-1">
		<p class="min-w-0 flex-1 basis-72 text-sm text-muted-foreground">{$t('periodDefinitions.calendarHint')}</p>
		{#if groups.some(isEmptyWeekend)}
			<label class="flex min-h-11 shrink-0 cursor-pointer items-center gap-2 text-sm"><Checkbox bind:checked={showEmptyWeekends} disabled={busy} />{$t('periodDefinitions.showEmptyWeekends')}</label>
		{/if}
	</div>
	<p role="status" aria-live="polite" class={failed ? 'text-sm text-destructive' : 'sr-only'}>{message}</p>
	{#if browser}
		<!-- svelte-ignore a11y_no_noninteractive_tabindex (Keyboard focus enables horizontal scrolling on narrow screens.) -->
		<div role="region" aria-label={$t('periodDefinitions.sectionTitle')} tabindex="0" class="overflow-x-auto rounded-collection border border-border bg-card focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary">
			<div class="period-calendar h-[640px] min-w-[760px]" data-testid="period-calendar" aria-busy={busy}>
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
