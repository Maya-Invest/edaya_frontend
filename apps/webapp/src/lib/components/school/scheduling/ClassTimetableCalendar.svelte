<script lang="ts">
	import type { PlanningEvent } from '$lib/types/school';
	import type { EventCss, CalendarInstanceApi } from '@svar-ui/svelte-calendar';
	import type { PlanningSlotFromDates } from './planning-calendar';
	import type { PlanningTimetableContext } from './planning-timetable-context';
	import { browser } from '$app/environment';
	import { reschedulePlanningSlotMutation } from '$lib/api/mutations/planning.mutations';
	import { lang, t } from '$lib/i18n';
	import { Calendar, Willow } from '@svar-ui/svelte-calendar';
	import { setContext } from 'svelte';
	import {
		calendarSlotFromDates,
		formatPlanningSlotLabel,
		mapPlanningToCalendarEvents,
		mondayOfWeek,
		overlappingPlanningEventIds,
		planningSlotSignature,
		subjectToneClass,
		timetableHours,
	} from './planning-calendar';
	import { PLANNING_TIMETABLE_CONTEXT } from './planning-timetable-context';
	import PlanningEventContent from './PlanningEventContent.svelte';
	import PlanningRescheduleConfirmModal from './PlanningRescheduleConfirmModal.svelte';
	import SvarCalendarLocale from './SvarCalendarLocale.svelte';

	const {
		events,
		selectedId,
		weekStart = mondayOfWeek(new Date()),
		editable = false,
		onSelect,
		onAttendance,
	}: {
		events: PlanningEvent[];
		selectedId?: string;
		weekStart?: Date;
		editable?: boolean;
		onSelect?: (event: PlanningEvent) => void;
		onAttendance?: (event: PlanningEvent) => void;
	} = $props();

	const anchorDate = $derived(mondayOfWeek(weekStart));
	const weekEvents = $derived(events);
	const overlapIds = $derived(overlappingPlanningEventIds(weekEvents));
	const hours = $derived(timetableHours(weekEvents));
	const calendarEvents = $derived(mapPlanningToCalendarEvents(weekEvents));
	const weekView = $derived({
		id: 'week',
		sections: {
			timeGrid: {
				yScale: {
					type: 'time',
					startHour: hours.startHour,
					endHour: hours.endHour,
					step: 30,
					snapStep: 15,
					ui: { minUnitHeight: 52 },
					format: 'timeScaleFormat',
				},
			},
		},
	});

	let confirmOpen = $state(false);
	let confirmBusy = $state(false);
	let pendingReschedule = $state<{
		event: PlanningEvent;
		slot: PlanningSlotFromDates;
	} | null>(null);

	const fromLabel = $derived(
		pendingReschedule
			? formatPlanningSlotLabel(pendingReschedule.event, day => $t(`day.full.${day}`))
			: '',
	);
	const toLabel = $derived(
		pendingReschedule
			? formatPlanningSlotLabel(
				{
					title: pendingReschedule.event.title,
					day: pendingReschedule.slot.day,
					start: pendingReschedule.slot.startTime,
					end: pendingReschedule.slot.endTime,
				},
				day => $t(`day.full.${day}`),
			)
			: '',
	);

	setContext<PlanningTimetableContext>(PLANNING_TIMETABLE_CONTEXT, {
		onAttendance: (eventId) => {
			const planningEvent = weekEvents.find(event => event.id === eventId);
			if (planningEvent)
				onAttendance?.(planningEvent);
		},
	});

	const eventCss: EventCss = ({ event }) => {
		const subject = typeof event.subject === 'string' ? event.subject : '';
		const active = selectedId === String(event.id);
		const kind = typeof event.kind === 'string' ? event.kind : 'lesson';
		const overlapping = overlapIds.has(String(event.id));
		const reschedulable = kind === 'lesson' || kind === 'activity';
		return [
			'group',
			typeof event.css === 'string' ? event.css : subjectToneClass(subject),
			active ? 'edaya-timetable-event--active' : '',
			editable && reschedulable ? 'edaya-timetable-event--editable' : '',
			overlapping ? 'edaya-timetable-event--overlap' : '',
			kind === 'homework-due' ? 'edaya-timetable-event--homework-due' : '',
			kind === 'activity' ? 'edaya-timetable-event--activity' : '',
			kind === 'assessment' ? 'edaya-timetable-event--assessment' : '',
		].filter(Boolean).join(' ');
	};

	function handleSelectEvent(payload: unknown) {
		if (!payload || typeof payload !== 'object' || !('id' in payload))
			return;
		const id = payload.id;
		if (id == null)
			return;
		const planningEvent = weekEvents.find(event => event.id === String(id));
		if (planningEvent)
			onSelect?.(planningEvent);
	}

	function coerceCalendarDate(value: unknown): Date | undefined {
		if (value instanceof Date) {
			return Number.isNaN(value.getTime()) ? undefined : value;
		}
		if (typeof value === 'string' || typeof value === 'number') {
			const date = new Date(value);
			return Number.isNaN(date.getTime()) ? undefined : date;
		}
		return undefined;
	}

	function handleUpdateEvent(payload: unknown) {
		if (!editable)
			return false;
		if (!payload || typeof payload !== 'object' || !('id' in payload) || !('event' in payload)) {
			return false;
		}

		const id = payload.id;
		const update = payload.event;
		if (id == null || !update || typeof update !== 'object')
			return false;

		const planningEvent = weekEvents.find(event => event.id === String(id));
		if (!planningEvent || (planningEvent.kind !== 'lesson' && planningEvent.kind !== 'activity'))
			return false;

		const [baseline] = mapPlanningToCalendarEvents([planningEvent]);
		const start = coerceCalendarDate('start' in update ? update.start : undefined) ?? baseline.start;
		const end = coerceCalendarDate('end' in update ? update.end : undefined) ?? baseline.end;
		if (!start || !end || end <= start)
			return false;

		const slot = calendarSlotFromDates(start, end);
		const baselineSlot = calendarSlotFromDates(baseline.start, baseline.end);
		const moved = start.getTime() !== baseline.start.getTime()
			|| end.getTime() !== baseline.end.getTime()
			|| planningSlotSignature({
				day: slot.day,
				start: slot.startTime,
				end: slot.endTime,
			}) !== planningSlotSignature({
				day: baselineSlot.day,
				start: baselineSlot.startTime,
				end: baselineSlot.endTime,
			});
		if (!moved)
			return false;

		pendingReschedule = { event: planningEvent, slot };
		confirmOpen = true;
		return false;
	}

	function handleInterceptAddEvent() {
		return false;
	}

	const calendarHandlersTag = Symbol('class-timetable-calendar');

	function initCalendar(api: CalendarInstanceApi) {
		api.on('select-event', handleSelectEvent, { tag: calendarHandlersTag });
		if (editable) {
			api.intercept('update-event', handleUpdateEvent, { tag: calendarHandlersTag });
			api.intercept('add-event', handleInterceptAddEvent, { tag: calendarHandlersTag });
		}
	}

	function closeConfirm() {
		if (confirmBusy)
			return;
		confirmOpen = false;
		pendingReschedule = null;
	}

	async function confirmReschedule() {
		if (!pendingReschedule)
			return;

		confirmBusy = true;
		const { event, slot } = pendingReschedule;
		const ok = await reschedulePlanningSlotMutation({
			sessionId: event.id,
			kind: event.kind,
			scheduleId: event.scheduleId,
			day: slot.day,
			dayOfWeek: slot.dayOfWeek,
			startTime: slot.startTime,
			endTime: slot.endTime,
			successMessage: $t('planning.rescheduleSuccess'),
			errorMessage: $t('planning.rescheduleError'),
		});

		confirmBusy = false;
		if (!ok)
			return;

		confirmOpen = false;
		pendingReschedule = null;
	}
</script>

{#if browser}
	<div class="edaya-timetable-calendar h-[min(780px,calc(100vh-13rem))] min-h-[520px] overflow-hidden rounded-2xl border border-border bg-card shadow-soft">
		{#key `${$lang}-${anchorDate.getTime()}-${editable}`}
			<SvarCalendarLocale lang={$lang}>
				<Willow fonts={false}>
					<Calendar
						events={calendarEvents}
						date={anchorDate}
						view="week"
						views={[weekView]}
						toolbar={null}
						readonly={!editable}
						init={initCalendar}
						{eventCss}
						eventContent={PlanningEventContent}
					/>
				</Willow>
			</SvarCalendarLocale>
		{/key}
	</div>

	<PlanningRescheduleConfirmModal
		bind:open={confirmOpen}
		title={pendingReschedule?.event.title ?? ''}
		{fromLabel}
		{toLabel}
		busy={confirmBusy}
		onCancel={closeConfirm}
		onConfirm={confirmReschedule}
	/>
{:else}
	<div
		class="flex h-[min(780px,calc(100vh-13rem))] min-h-[520px] items-center justify-center rounded-2xl border border-border bg-card/50"
		aria-hidden="true"
	></div>
{/if}

<style>
	:global(.edaya-timetable-calendar .wx-willow-theme) {
		--wx-color-primary: hsl(var(--primary));
		--wx-color-primary-font: hsl(var(--primary-foreground));
		--wx-color-secondary-font: hsl(var(--primary));
		--wx-color-secondary-border: hsl(var(--primary));
		--wx-color-font: hsl(var(--foreground));
		--wx-color-font-alt: hsl(var(--muted-foreground));
		--wx-background: hsl(var(--card));
		--wx-background-alt: hsl(var(--secondary));
		--wx-background-hover: hsl(var(--secondary));
		--wx-border: 1px solid hsl(var(--border));
		--wx-border-radius: 0.75rem;
		--wx-radius-major: 1rem;
		--wx-font-family: var(--font-sans);
		--wx-font-size-sm: 11px;
		--wx-calendar-grid-color: hsl(var(--border));
		--wx-calendar-weekend-background: hsl(var(--secondary) / 0.35);
		height: 100%;
	}

	:global(.edaya-timetable-calendar .wx-box-event) {
		border: 1px solid transparent;
		box-shadow: var(--shadow-soft);
	}

	:global(.edaya-timetable-calendar .wx-box-event.edaya-subject-tone-a) {
		background: hsl(var(--secondary));
		color: hsl(var(--foreground));
		border-color: hsl(var(--border));
	}

	:global(.edaya-timetable-calendar .wx-box-event.edaya-subject-tone-b) {
		background: hsl(var(--primary) / 0.1);
		color: hsl(var(--foreground));
		border-color: hsl(var(--primary) / 0.25);
	}

	:global(.edaya-timetable-calendar .wx-box-event.edaya-subject-tone-c) {
		background: hsl(var(--highlight-soft));
		color: hsl(var(--foreground));
		border-color: hsl(var(--highlight) / 0.25);
	}

	:global(.edaya-timetable-calendar .wx-box-event.edaya-subject-tone-d) {
		background: hsl(var(--accent-soft));
		color: hsl(var(--foreground));
		border-color: hsl(var(--accent) / 0.25);
	}

	:global(.edaya-timetable-calendar .wx-box-event.edaya-timetable-event--active) {
		outline: 2px solid hsl(var(--primary));
		outline-offset: 1px;
	}

	:global(.edaya-timetable-calendar .wx-box-event.edaya-timetable-event--overlap) {
		outline: 2px solid hsl(var(--destructive) / 0.85);
		outline-offset: 1px;
	}

	:global(.edaya-timetable-calendar .wx-box-event.edaya-homework-due) {
		background: hsl(var(--highlight-soft));
		border-style: dashed;
		border-color: hsl(var(--highlight) / 0.55);
		color: hsl(var(--foreground));
	}

	:global(.edaya-timetable-calendar .wx-box-event.edaya-occurrence-activity) {
		background: hsl(var(--accent-soft));
		border-color: hsl(var(--accent) / 0.45);
		color: hsl(var(--foreground));
	}

	:global(.edaya-timetable-calendar .wx-box-event.edaya-occurrence-assessment) {
		background: hsl(var(--primary) / 0.14);
		border-color: hsl(var(--primary) / 0.4);
		color: hsl(var(--foreground));
	}

	:global(.edaya-timetable-calendar .wx-box-event.edaya-occurrence-cancelled) {
		opacity: 0.55;
		border-style: dashed;
		text-decoration: line-through;
	}

	:global(.edaya-timetable-calendar .wx-box-event.edaya-timetable-event--assessment) {
		cursor: default;
	}

	:global(.edaya-timetable-calendar .wx-box-event.edaya-timetable-event--editable) {
		cursor: grab;
	}

	:global(.edaya-timetable-calendar .wx-box-event.edaya-timetable-event--editable.wx-dragging) {
		cursor: grabbing;
	}

	:global(.edaya-timetable-calendar .wx-box-event:hover) {
		opacity: 1;
		transform: translateY(-1px);
	}
</style>
