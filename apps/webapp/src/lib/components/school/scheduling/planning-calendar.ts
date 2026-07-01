import type { PlanningEvent } from '$lib/types/school';

export const TIMETABLE_DAY_OFFSET: Record<PlanningEvent['day'], number> = {
	Mon: 0,
	Tue: 1,
	Wed: 2,
	Thu: 3,
	Fri: 4,
};

export const TIMETABLE_DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const;

export type ScheduleDayOfWeek
	= | 'monday'
		| 'tuesday'
		| 'wednesday'
		| 'thursday'
		| 'friday'
		| 'saturday'
		| 'sunday';

export const SCHEDULE_DAY_TO_PLANNING: Record<ScheduleDayOfWeek, PlanningEvent['day']> = {
	monday: 'Mon',
	tuesday: 'Tue',
	wednesday: 'Wed',
	thursday: 'Thu',
	friday: 'Fri',
	saturday: 'Mon',
	sunday: 'Mon',
};

export const PLANNING_DAY_TO_SCHEDULE: Record<PlanningEvent['day'], ScheduleDayOfWeek> = {
	Mon: 'monday',
	Tue: 'tuesday',
	Wed: 'wednesday',
	Thu: 'thursday',
	Fri: 'friday',
};

const DAY_LABEL_TO_SCHEDULE: Record<PlanningEvent['day'], ScheduleDayOfWeek> = PLANNING_DAY_TO_SCHEDULE;

export interface PlanningSlotFromDates {
	day: PlanningEvent['day'];
	startTime: string;
	endTime: string;
	dayOfWeek: ScheduleDayOfWeek;
	startsAt: Date;
	endsAt: Date;
}

export function mondayOfWeek(date: Date): Date {
	const d = new Date(date);
	d.setHours(0, 0, 0, 0);
	const diff = (d.getDay() + 6) % 7;
	d.setDate(d.getDate() - diff);
	return d;
}

export function shiftWeek(weekStart: Date, weeks: number): Date {
	const next = new Date(weekStart);
	next.setDate(next.getDate() + weeks * 7);
	return next;
}

export function formatWeekAnchor(date: Date): string {
	const monday = mondayOfWeek(date);
	const year = monday.getFullYear();
	const month = `${monday.getMonth() + 1}`.padStart(2, '0');
	const day = `${monday.getDate()}`.padStart(2, '0');
	return `${year}-${month}-${day}`;
}

export function formatWeekAnchorUtc(date: Date): string {
	const monday = mondayOfWeekUtc(date);
	const year = monday.getUTCFullYear();
	const month = `${monday.getUTCMonth() + 1}`.padStart(2, '0');
	const day = `${monday.getUTCDate()}`.padStart(2, '0');
	return `${year}-${month}-${day}`;
}

export function planningEventWeekAnchor(startsAt: string | Date): string {
	return formatWeekAnchorUtc(mondayOfWeekUtc(new Date(startsAt)));
}

export function filterPlanningEventsForWeek(
	events: PlanningEvent[],
	weekStart: Date,
): PlanningEvent[] {
	const anchor = formatWeekAnchorUtc(mondayOfWeekUtc(weekStart));
	return events.filter(event => planningEventWeekAnchor(event.startsAt) === anchor);
}

export function parseWeekAnchor(value: string | undefined, fallback = new Date()): Date {
	const trimmed = value?.trim() ?? '';
	if (!/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
		return mondayOfWeek(fallback);
	}
	const parsed = new Date(`${trimmed}T12:00:00`);
	if (Number.isNaN(parsed.getTime())) {
		return mondayOfWeek(fallback);
	}
	return mondayOfWeek(parsed);
}

export function isCurrentWeek(weekStart: Date, reference = new Date()): boolean {
	return formatWeekAnchor(weekStart) === formatWeekAnchor(reference);
}

export function formatPlanningWeekRange(weekStart: Date, locale: string): { start: string; end: string } {
	const friday = new Date(weekStart);
	friday.setDate(friday.getDate() + 4);
	const sameMonth = weekStart.getMonth() === friday.getMonth();
	const sameYear = weekStart.getFullYear() === friday.getFullYear();

	if (sameMonth) {
		return {
			start: weekStart.toLocaleDateString(locale, { day: 'numeric', month: 'long' }),
			end: friday.toLocaleDateString(locale, { day: 'numeric', month: 'long', year: 'numeric' }),
		};
	}

	return {
		start: weekStart.toLocaleDateString(locale, {
			day: 'numeric',
			month: 'short',
			year: sameYear ? undefined : 'numeric',
		}),
		end: friday.toLocaleDateString(locale, { day: 'numeric', month: 'long', year: 'numeric' }),
	};
}

/** Monday 00:00 UTC for the week containing `date` (matches seed session instants). */
export function mondayOfWeekUtc(date: Date): Date {
	const d = new Date(date);
	d.setUTCHours(0, 0, 0, 0);
	const diff = (d.getUTCDay() + 6) % 7;
	d.setUTCDate(d.getUTCDate() - diff);
	return d;
}

/**
 * Builds concrete session instants on the same reference week as `referenceStartsAt`,
 * using UTC wall-clock times (same convention as dev seed `parseSeedDateTime`).
 */
export function sessionInstantsForSlot(
	referenceStartsAt: Date | string,
	slot: Pick<PlanningSlotFromDates, 'day' | 'startTime' | 'endTime'>,
): { startsAt: Date; endsAt: Date } {
	const weekStart = mondayOfWeekUtc(new Date(referenceStartsAt));

	const startsAt = new Date(weekStart);
	startsAt.setUTCDate(startsAt.getUTCDate() + TIMETABLE_DAY_OFFSET[slot.day]);
	const startParts = parseTimeOfDay(slot.startTime);
	startsAt.setUTCHours(startParts.hours, startParts.minutes, 0, 0);

	const endsAt = new Date(weekStart);
	endsAt.setUTCDate(endsAt.getUTCDate() + TIMETABLE_DAY_OFFSET[slot.day]);
	const endParts = parseTimeOfDay(slot.endTime);
	endsAt.setUTCHours(endParts.hours, endParts.minutes, 0, 0);

	return { startsAt, endsAt };
}

function formatTimeOfDay(date: Date): string {
	const hours = `${date.getHours()}`.padStart(2, '0');
	const minutes = `${date.getMinutes()}`.padStart(2, '0');
	return `${hours}:${minutes}`;
}

function weekdayLabel(date: Date): PlanningEvent['day'] {
	const label = TIMETABLE_DAY_LABELS[date.getDay()] ?? 'Mon';
	if (label === 'Sun' || label === 'Sat') {
		return 'Mon';
	}
	return label;
}

export function calendarSlotFromDates(start: Date, end: Date): PlanningSlotFromDates {
	const day = weekdayLabel(start);
	return {
		day,
		startTime: formatTimeOfDay(start),
		endTime: formatTimeOfDay(end),
		dayOfWeek: DAY_LABEL_TO_SCHEDULE[day],
		startsAt: start,
		endsAt: end,
	};
}

export function planningSlotSignature(event: Pick<PlanningEvent, 'day' | 'start' | 'end'>): string {
	return `${event.day}|${event.start}|${event.end}`;
}

export function formatPlanningSlotLabel(
	event: Pick<PlanningEvent, 'day' | 'start' | 'end' | 'title'>,
	dayLabel: (day: PlanningEvent['day']) => string,
): string {
	return `${event.title} · ${dayLabel(event.day)} ${event.start}–${event.end}`;
}

function parseTimeOfDay(time: string): { hours: number; minutes: number } {
	const [hours = 0, minutes = 0] = time.split(':').map(part => Number.parseInt(part, 10));
	return { hours, minutes };
}

export interface TimetableCalendarEvent {
	id: string;
	start: Date;
	end: Date;
	text: string;
	subject: string;
	room: string;
	teacher: string;
	kind?: PlanningEvent['kind'];
	css?: string;
}

export function subjectToneClass(subject: string): string {
	const tones = ['tone-a', 'tone-b', 'tone-c', 'tone-d'];
	let hash = 0;
	for (let i = 0; i < subject.length; i++) hash = (hash + subject.charCodeAt(i)) % tones.length;
	return `edaya-subject-${tones[hash]}`;
}

export function mapPlanningToCalendarEvents(
	events: PlanningEvent[],
): TimetableCalendarEvent[] {
	return events.map((event) => {
		const start = new Date(event.startsAt);
		const end = new Date(event.endsAt);

		return {
			id: event.id,
			start,
			end,
			text: event.title,
			subject: event.subject,
			room: event.room,
			teacher: event.teacher,
			kind: event.kind,
			css: calendarEventCss(event),
		};
	});
}

function calendarEventCss(event: PlanningEvent): string {
	if (event.kind === 'homework-due') {
		return 'edaya-homework-due';
	}
	return subjectToneClass(event.subject);
}

export function weekGenerationRange(weekStart: Date): { startDate: Date; endDate: Date } {
	const startDate = mondayOfWeekUtc(weekStart);
	const endDate = new Date(startDate);
	endDate.setUTCDate(endDate.getUTCDate() + 4);
	endDate.setUTCHours(23, 59, 59, 999);
	return { startDate, endDate };
}

export function timetableHours(events: PlanningEvent[]): { startHour: number; endHour: number } {
	if (events.length === 0)
		return { startHour: 7, endHour: 18 };

	let minHour = 24;
	let maxMinutes = 0;

	for (const event of events) {
		const [startHour = 0] = event.start.split(':').map(Number);
		const [endHour = 0, endMinute = 0] = event.end.split(':').map(Number);
		minHour = Math.min(minHour, startHour);
		maxMinutes = Math.max(maxMinutes, endHour * 60 + endMinute);
	}

	const endHour = Math.ceil(maxMinutes / 60);

	return {
		startHour: Math.max(6, minHour - 1),
		endHour: Math.min(21, Math.max(endHour + 1, 18)),
	};
}

export interface PlanningOverlap {
	left: PlanningEvent;
	right: PlanningEvent;
}

function isTimedPlanningEvent(event: PlanningEvent): boolean {
	return event.kind !== 'homework-due';
}

export function detectPlanningOverlaps(events: readonly PlanningEvent[]): PlanningOverlap[] {
	const timed = events.filter(isTimedPlanningEvent);
	const overlaps: PlanningOverlap[] = [];

	for (let i = 0; i < timed.length; i++) {
		for (let j = i + 1; j < timed.length; j++) {
			const left = timed[i]!;
			const right = timed[j]!;
			if (planningEventsOverlap(left, right)) {
				overlaps.push({ left, right });
			}
		}
	}

	return overlaps;
}

export function overlappingPlanningEventIds(events: readonly PlanningEvent[]): Set<string> {
	const ids = new Set<string>();
	for (const { left, right } of detectPlanningOverlaps(events)) {
		ids.add(left.id);
		ids.add(right.id);
	}
	return ids;
}

function planningEventsOverlap(left: PlanningEvent, right: PlanningEvent): boolean {
	const leftStart = new Date(left.startsAt).getTime();
	const leftEnd = new Date(left.endsAt).getTime();
	const rightStart = new Date(right.startsAt).getTime();
	const rightEnd = new Date(right.endsAt).getTime();
	return leftStart < rightEnd && rightStart < leftEnd;
}
