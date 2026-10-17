<script lang="ts">
	import type { PlanningEvent, SchoolYearEvent } from '$lib/types/school';

	import type { EventCss, CalendarInstanceApi } from '@svar-ui/svelte-calendar';
	import { browser } from '$app/environment';
	import { afterNavigate } from '$app/navigation';
	import SvarCalendarLocale from '$lib/components/calendar/SvarCalendarLocale.svelte';

	import { lang, t } from '$lib/i18n';
	import {
		calendarSlotFromDates,
		formatPlanningSlotLabel,
		isSchoolCalendarEventId,
		mapPlanningToCalendarEvents,
		mapSchoolYearEventsToCalendarEvents,
		mondayOfWeek,
		overlappingPlanningEventIds,
		planningSlotSignature,
		subjectToneClass,
		timetableExpandedUnitHeight,
		timetableHours,
	} from '$lib/scheduling/planning-calendar';
	import { cn } from '$lib/utils';
	import { Calendar, Willow } from '@svar-ui/svelte-calendar';
	import { getPlanningTimetableState, PlanningTimetableState, setPlanningTimetableState } from '../planning-timetable-state.svelte';
	import PlanningEventContent from './PlanningEventContent.svelte';
	import PlanningRescheduleConfirmModal from './PlanningRescheduleConfirmModal.svelte';

	const actionState = getPlanningTimetableState();

	const {
		events,
		schoolYearEvents = [],
		classId,
		selectedId,
		weekStart = mondayOfWeek(new Date()),
		expandCalendar = false,
		editable = false,
		onSelect,
		onAttendance,
		rescheduleOpen = false,
		rescheduleTarget = null,
		onRescheduleRequest,
		onInvalidReschedule,
		onRescheduleClose,
		onChanged,
	}: {
		events: PlanningEvent[];
		schoolYearEvents?: SchoolYearEvent[];
		classId: string;
		selectedId?: string;
		weekStart?: Date;
		expandCalendar?: boolean;
		editable?: boolean;
		onSelect?: (event: PlanningEvent) => void;
		onAttendance?: (event: PlanningEvent) => void;
		rescheduleOpen?: boolean;
		rescheduleTarget?: string | null;
		onRescheduleRequest?: (eventId: string) => void;
		onInvalidReschedule?: () => void;
		onRescheduleClose?: () => void;
		onChanged?: () => Promise<void>;
	} = $props();

	const timetable = new PlanningTimetableState();
	setPlanningTimetableState(timetable);

	const anchorDate = $derived(mondayOfWeek(weekStart));
	const weekEvents = $derived(events);
	const overlapIds = $derived(overlappingPlanningEventIds(weekEvents));
	const hours = $derived(timetableHours(weekEvents));
	let calendarContainer = $state<HTMLDivElement | null>(null);
	let expandedLayoutHeight = $state<number | null>(null);

	$effect(() => {
		if (!browser || !expandCalendar || !calendarContainer) {
			expandedLayoutHeight = null;
			return;
		}

		const updateLayout = () => {
			const top = calendarContainer?.getBoundingClientRect().top ?? 0;
			expandedLayoutHeight = Math.max(520, Math.round(window.innerHeight - top - 24));
		};

		updateLayout();
		const observer = new ResizeObserver(updateLayout);
		observer.observe(calendarContainer);
		window.addEventListener('resize', updateLayout);

		return () => {
			observer.disconnect();
			window.removeEventListener('resize', updateLayout);
		};
	});

	const gridUnitHeight = $derived(
		expandCalendar && expandedLayoutHeight
			? timetableExpandedUnitHeight(expandedLayoutHeight, hours.startHour, hours.endHour)
			: 52,
	);
	const calendarEvents = $derived([
		...mapSchoolYearEventsToCalendarEvents(schoolYearEvents, anchorDate, classId),
		...mapPlanningToCalendarEvents(weekEvents),
	]);
	const calendarEventsKey = $derived([
		...weekEvents.map(event => `${event.id}:${event.status ?? 'pending'}:${event.timetableGenerated ?? ''}`),
		...schoolYearEvents.map(event => `${event.id}:${event.date}:${event.endDate ?? ''}`),
	].join('|'));

	timetable.configure({ onAttendance: (eventId) => {
		const planningEvent = weekEvents.find(event => event.id === eventId);
		if (planningEvent) {
			onAttendance?.(planningEvent);
		}
	} });
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
					ui: { minUnitHeight: gridUnitHeight },
					format: 'timeScaleFormat',
				},
			},
		},
	});

	const fromLabel = $derived(
		timetable.pendingReschedule
			? formatPlanningSlotLabel(timetable.pendingReschedule.event, day => $t(`day.full.${day}`))
			: '',
	);
	const toLabel = $derived(
		timetable.pendingReschedule
			? formatPlanningSlotLabel(
				{
					title: timetable.pendingReschedule.event.title,
					day: timetable.pendingReschedule.slot.day,
					start: timetable.pendingReschedule.slot.startTime,
					end: timetable.pendingReschedule.slot.endTime,
				},
				day => $t(`day.full.${day}`),
			)
			: '',
	);

	afterNavigate(() => {
		const pendingTarget = timetable.pendingReschedule?.event.id ?? null;
		if (rescheduleOpen && pendingTarget !== rescheduleTarget) {
			onInvalidReschedule?.();
		}
		else if (!rescheduleOpen && pendingTarget) {
			timetable.closeConfirm();
		}
	});

	const eventCss: EventCss = ({ event }) => {
		const subject = typeof event.subject === 'string' ? event.subject : '';
		const active = selectedId === String(event.id);
		const kind = typeof event.kind === 'string' ? event.kind : 'lesson';
		const overlapping = overlapIds.has(String(event.id));
		const reschedulable = kind === 'lesson' || kind === 'activity';
		const calendarType = typeof event.calendarType === 'string' ? event.calendarType : '';
		return [
			'group',
			kind === 'school-calendar'
				? (typeof event.css === 'string' ? event.css : `edaya-school-cal-${calendarType}`)
				: (typeof event.css === 'string' ? event.css : subjectToneClass(subject)),
			kind === 'school-calendar' ? 'edaya-timetable-event--school-calendar' : '',
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
		if (isSchoolCalendarEventId(String(id)))
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
		if (isSchoolCalendarEventId(String(id)))
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

		timetable.queueReschedule(planningEvent, slot);
		onRescheduleRequest?.(planningEvent.id);
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
		timetable.closeConfirm();
		onRescheduleClose?.();
	}

	async function confirmReschedule() {
		await timetable.confirmReschedule(async input => actionState.performReschedulePlanningSlot({
			sessionId: input.sessionId,
			kind: input.kind,
			scheduleId: input.scheduleId,
			day: input.day,
			dayOfWeek: input.dayOfWeek,
			startTime: input.startTime,
			endTime: input.endTime,
			successMessage: $t('planning.rescheduleSuccess'),
			errorMessage: $t('planning.rescheduleError'),
		}));
		await onChanged?.();
		if (!timetable.pendingReschedule) {
			onRescheduleClose?.();
		}
	}
</script>

{#if browser}
	<div
		bind:this={calendarContainer}
		class={cn(
			'edaya-timetable-calendar overflow-hidden rounded-2xl border border-border bg-card shadow-soft',
			expandCalendar ? 'min-h-[520px]' : 'h-[min(780px,calc(100vh-13rem))] min-h-[520px]',
		)}
		style:height={expandCalendar && expandedLayoutHeight ? `${expandedLayoutHeight}px` : undefined}
	>
		{#key `${$lang}-${anchorDate.getTime()}-${editable}-${calendarEventsKey}-${expandCalendar ? `${expandedLayoutHeight}-${gridUnitHeight}` : ''}`}
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
		open={rescheduleOpen && timetable.pendingReschedule?.event.id === rescheduleTarget}
		title={timetable.pendingReschedule?.event.title ?? ''}
		{fromLabel}
		{toLabel}
		busy={timetable.confirmBusy}
		onCancel={closeConfirm}
		onConfirm={confirmReschedule}
	/>
{:else}
	<div
		class={cn(
			'flex items-center justify-center rounded-2xl border border-border bg-card/50',
			expandCalendar ? 'min-h-[520px]' : 'h-[min(780px,calc(100vh-13rem))] min-h-[520px]',
		)}
		style:height={expandCalendar && expandedLayoutHeight ? `${expandedLayoutHeight}px` : undefined}
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
		--wx-border-radius: var(--radius-control);
		--wx-radius-major: var(--radius-surface);
		--wx-font-family: var(--font-sans);
		--wx-font-size-sm: 12px;
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

	:global(.edaya-timetable-calendar .wx-box-event.edaya-timetable-event--school-calendar) {
		cursor: default;
		box-shadow: none;
		opacity: 0.72;
		border-style: dashed;
		border-width: 2px;
	}

	:global(.edaya-timetable-calendar .wx-box-event.edaya-school-cal-holiday) {
		background: hsl(var(--destructive) / 0.12);
		border-color: hsl(var(--destructive) / 0.35);
		color: hsl(var(--destructive));
	}

	:global(.edaya-timetable-calendar .wx-box-event.edaya-school-cal-vacation) {
		background: hsl(var(--sky-soft));
		border-color: hsl(var(--sky) / 0.35);
		color: hsl(var(--sky));
	}

	:global(.edaya-timetable-calendar .wx-box-event.edaya-school-cal-closure) {
		background: hsl(var(--highlight-soft));
		border-color: hsl(var(--highlight) / 0.35);
		color: hsl(var(--foreground));
	}

	:global(.edaya-timetable-calendar .wx-box-event.edaya-school-cal-ceremony) {
		background: hsl(var(--primary) / 0.12);
		border-color: hsl(var(--primary) / 0.3);
		color: hsl(var(--foreground));
	}

	:global(.edaya-timetable-calendar .wx-bar-event) {
		border: 1px solid transparent;
		border-radius: 0.375rem;
	}

	:global(.edaya-timetable-calendar .wx-bar-event.edaya-timetable-event--school-calendar) {
		cursor: default;
		box-shadow: none;
	}

	:global(.edaya-timetable-calendar .wx-bar-event.edaya-school-cal-ceremony) {
		background: hsl(var(--primary) / 0.12);
		border-color: hsl(var(--primary) / 0.3);
		color: hsl(var(--foreground));
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
