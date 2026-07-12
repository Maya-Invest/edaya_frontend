import type { PlanningEvent, SchoolYearEvent } from '$lib/types/school';
import { parseCivilDate } from '$lib/date/format';

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

export function formatCalendarDate(date: Date): string {
	const year = date.getFullYear();
	const month = `${date.getMonth() + 1}`.padStart(2, '0');
	const day = `${date.getDate()}`.padStart(2, '0');
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

export function todayDate(): Date {
	return new Date();
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

/** Map stored UTC instants to local Date objects that preserve UTC wall-clock time. */
export function utcWallClockDate(value: Date | string): Date {
	const source = value instanceof Date ? value : new Date(String(value));
	return new Date(
		source.getUTCFullYear(),
		source.getUTCMonth(),
		source.getUTCDate(),
		source.getUTCHours(),
		source.getUTCMinutes(),
		source.getUTCSeconds(),
		source.getUTCMilliseconds(),
	);
}

function formatWallClockTimeOfDay(date: Date): string {
	const hours = `${date.getHours()}`.padStart(2, '0');
	const minutes = `${date.getMinutes()}`.padStart(2, '0');
	return `${hours}:${minutes}`;
}

function wallClockWeekdayLabel(date: Date): PlanningEvent['day'] {
	const label = TIMETABLE_DAY_LABELS[date.getDay()] ?? 'Mon';
	if (label === 'Sun' || label === 'Sat') {
		return 'Mon';
	}
	return label;
}

export function calendarSlotFromDates(start: Date, end: Date): PlanningSlotFromDates {
	const day = wallClockWeekdayLabel(start);
	return {
		day,
		startTime: formatWallClockTimeOfDay(start),
		endTime: formatWallClockTimeOfDay(end),
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

export interface PlanningEventCellContent {
	primary: string;
	secondary: string;
}

/** Primary/secondary lines for timetable grid cells — keep cells scannable by session kind. */
export function planningEventCellContent(event: {
	kind?: PlanningEvent['kind'] | 'school-calendar';
	subject?: string;
	title?: string;
	text?: string;
	teacher?: string;
}): PlanningEventCellContent {
	const title = String(event.text ?? event.title ?? '');
	const subject = String(event.subject ?? '');

	switch (event.kind) {
		case 'lesson':
			return {
				primary: subject || title,
				secondary: String(event.teacher ?? ''),
			};
		case 'activity':
			return {
				primary: subject || title,
				secondary: title && title !== subject ? title : '',
			};
		case 'assessment':
			return {
				primary: subject || title,
				secondary: title && title !== subject ? title : '',
			};
		default:
			return {
				primary: title || subject,
				secondary: '',
			};
	}
}

function parseTimeOfDay(time: string): { hours: number; minutes: number } {
	const [hours = 0, minutes = 0] = time.split(':').map(part => Number.parseInt(part, 10));
	return { hours, minutes };
}

export interface TimetableCalendarEvent {
	id: string;
	start: Date;
	end: Date;
	allDay?: boolean;
	text: string;
	subject: string;
	room: string;
	teacher: string;
	kind?: PlanningEvent['kind'] | 'school-calendar';
	calendarType?: SchoolYearEvent['type'];
	status?: PlanningEvent['status'];
	timetableGenerated?: PlanningEvent['timetableGenerated'];
	css?: string;
}

export const SCHOOL_CALENDAR_EVENT_ID_PREFIX = 'school-cal-';

export function isSchoolCalendarEventId(id: string): boolean {
	return id.startsWith(SCHOOL_CALENDAR_EVENT_ID_PREFIX);
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
		const start = utcWallClockDate(event.startsAt);
		const end = utcWallClockDate(event.endsAt);

		return {
			id: event.id,
			start,
			end,
			text: event.title,
			subject: event.subject,
			room: event.room,
			teacher: event.teacher,
			kind: event.kind,
			status: event.status,
			timetableGenerated: event.timetableGenerated,
			css: calendarEventCss(event),
		};
	});
}

function calendarEventCss(event: PlanningEvent): string {
	if (event.status === 'cancelled') {
		return 'edaya-occurrence-cancelled';
	}
	if (event.kind === 'homework-due') {
		return 'edaya-homework-due';
	}
	if (event.kind === 'activity') {
		return 'edaya-occurrence-activity';
	}
	if (event.kind === 'assessment') {
		return 'edaya-occurrence-assessment';
	}
	return subjectToneClass(event.subject);
}

export function isPlanningEventReschedulable(event: PlanningEvent): boolean {
	return event.kind === 'lesson' || event.kind === 'activity';
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

export const TIMETABLE_CALENDAR_HEADER_HEIGHT = 48;
export const TIMETABLE_CALENDAR_MIN_UNIT_HEIGHT = 40;

export function timetableTimeSlotCount(
	startHour: number,
	endHour: number,
	stepMinutes = 30,
): number {
	return Math.max(1, Math.round(((endHour - startHour) * 60) / stepMinutes));
}

export function timetableExpandedUnitHeight(
	containerHeight: number,
	startHour: number,
	endHour: number,
	options?: {
		stepMinutes?: number;
		headerHeight?: number;
		minUnitHeight?: number;
	},
): number {
	const stepMinutes = options?.stepMinutes ?? 30;
	const headerHeight = options?.headerHeight ?? TIMETABLE_CALENDAR_HEADER_HEIGHT;
	const minUnitHeight = options?.minUnitHeight ?? TIMETABLE_CALENDAR_MIN_UNIT_HEIGHT;
	const slots = timetableTimeSlotCount(startHour, endHour, stepMinutes);
	const available = Math.max(0, containerHeight - headerHeight);
	return Math.max(minUnitHeight, Math.floor(available / slots));
}

export interface PlanningOverlap {
	left: PlanningEvent;
	right: PlanningEvent;
}

function isTimedPlanningEvent(event: PlanningEvent): boolean {
	return event.kind !== 'homework-due';
}

/** Occurrences still shown on the active timetable grid (excludes cancelled). */
export function isActivePlanningEvent(event: PlanningEvent): boolean {
	return event.status !== 'cancelled';
}

export function activePlanningEvents(events: readonly PlanningEvent[]): PlanningEvent[] {
	return events.filter(isActivePlanningEvent);
}

export function detectPlanningOverlaps(events: readonly PlanningEvent[]): PlanningOverlap[] {
	const timed = activePlanningEvents(events).filter(isTimedPlanningEvent);
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

const WEEKDAY_LABELS: PlanningEvent['day'][] = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];

export function schoolYearEventEndDate(event: SchoolYearEvent): string {
	return event.endDate ?? event.date;
}

export function schoolYearEventAppliesToClass(event: SchoolYearEvent, classId: string): boolean {
	if (event.scope === 'all') {
		return true;
	}
	return Array.isArray(event.scope) && event.scope.includes(classId);
}

export function weekDateRange(weekStart: Date): { start: string; end: string } {
	const start = formatCalendarDate(weekStart);
	const sunday = new Date(weekStart);
	sunday.setDate(sunday.getDate() + 6);
	return { start, end: formatCalendarDate(sunday) };
}

export function dateRangeIntersectsWeek(
	startDate: string,
	endDate: string,
	weekStart: Date,
): boolean {
	const { start, end } = weekDateRange(weekStart);
	return startDate <= end && endDate >= start;
}

export function filterSchoolYearEventsForWeek(
	events: SchoolYearEvent[],
	weekStart: Date,
	classId: string,
): SchoolYearEvent[] {
	return events.filter((event) => {
		if (!schoolYearEventAppliesToClass(event, classId)) {
			return false;
		}
		return dateRangeIntersectsWeek(event.date, schoolYearEventEndDate(event), weekStart);
	});
}

export function schoolYearEventDaysInWeek(
	event: SchoolYearEvent,
	weekStart: Date,
): PlanningEvent['day'][] {
	const eventStart = event.date;
	const eventEnd = schoolYearEventEndDate(event);
	const days: PlanningEvent['day'][] = [];

	for (let index = 0; index < WEEKDAY_LABELS.length; index++) {
		const dayDate = new Date(weekStart);
		dayDate.setDate(dayDate.getDate() + index);
		const anchor = formatCalendarDate(dayDate);
		if (anchor >= eventStart && anchor <= eventEnd) {
			days.push(WEEKDAY_LABELS[index]!);
		}
	}

	return days;
}

export function isNonSchoolDayEventType(type: SchoolYearEvent['type']): boolean {
	return type === 'holiday' || type === 'vacation' || type === 'closure';
}

export function schoolYearEventBlocksTimetable(event: SchoolYearEvent): boolean {
	if (event.type === 'ceremony') {
		return false;
	}
	return event.blocksTimetable ?? true;
}

export interface SchoolCalendarDayMarker {
	day: PlanningEvent['day'];
	date: string;
	events: SchoolYearEvent[];
}

export function schoolCalendarMarkersForWeek(
	events: SchoolYearEvent[],
	weekStart: Date,
	classId: string,
): SchoolCalendarDayMarker[] {
	const weekEvents = filterSchoolYearEventsForWeek(events, weekStart, classId);
	const markers: SchoolCalendarDayMarker[] = [];

	for (let index = 0; index < WEEKDAY_LABELS.length; index++) {
		const day = WEEKDAY_LABELS[index]!;
		const dayDate = new Date(weekStart);
		dayDate.setDate(dayDate.getDate() + index);
		const date = formatCalendarDate(dayDate);
		const dayEvents = weekEvents.filter(event =>
			schoolYearEventDaysInWeek(event, weekStart).includes(day),
		);
		markers.push({ day, date, events: dayEvents });
	}

	return markers;
}

/** Wall-clock hours used when rendering school calendar events on the class timetable grid. */
export const SCHOOL_CALENDAR_DAY_START = '06:00';
export const SCHOOL_CALENDAR_DAY_END = '18:00';

export function schoolCalendarDayInstants(date: string): { start: Date; end: Date } {
	const noon = parseCivilDate(date);
	const start = new Date(noon);
	start.setHours(6, 0, 0, 0);
	const end = new Date(noon);
	end.setHours(18, 0, 0, 0);
	return { start, end };
}

/** Exclusive end instant for SVAR all-day ceremony bars spanning civil dates. */
export function schoolCalendarCeremonyAllDayInstants(
	startDate: string,
	endDate: string,
): { start: Date; end: Date } {
	const start = parseCivilDate(startDate);
	start.setHours(0, 0, 0, 0);
	const end = parseCivilDate(endDate);
	end.setDate(end.getDate() + 1);
	end.setHours(0, 0, 0, 0);
	return { start, end };
}

export function schoolYearEventDatesInWeek(event: SchoolYearEvent, weekStart: Date): string[] {
	const { start: weekStartDate, end: weekEndDate } = weekDateRange(weekStart);
	const rangeStart = event.date > weekStartDate ? event.date : weekStartDate;
	const rangeEnd = schoolYearEventEndDate(event) < weekEndDate
		? schoolYearEventEndDate(event)
		: weekEndDate;
	if (rangeStart > rangeEnd) {
		return [];
	}

	const dates: string[] = [];
	const cursor = parseCivilDate(rangeStart);
	const end = parseCivilDate(rangeEnd);
	while (cursor.getTime() <= end.getTime()) {
		dates.push(formatCalendarDate(cursor));
		cursor.setDate(cursor.getDate() + 1);
	}
	return dates;
}

function schoolYearEventCss(type: SchoolYearEvent['type']): string {
	switch (type) {
		case 'holiday':
			return 'edaya-school-cal-holiday';
		case 'vacation':
			return 'edaya-school-cal-vacation';
		case 'closure':
			return 'edaya-school-cal-closure';
		default:
			return 'edaya-school-cal-ceremony';
	}
}

export function mapSchoolYearEventsToCalendarEvents(
	events: SchoolYearEvent[],
	weekStart: Date,
	classId: string,
): TimetableCalendarEvent[] {
	const mapped: TimetableCalendarEvent[] = [];

	for (const event of filterSchoolYearEventsForWeek(events, weekStart, classId)) {
		if (event.type === 'ceremony') {
			const dates = schoolYearEventDatesInWeek(event, weekStart);
			if (dates.length === 0) {
				continue;
			}

			const { start, end } = schoolCalendarCeremonyAllDayInstants(
				dates[0]!,
				dates[dates.length - 1]!,
			);
			mapped.push({
				id: `${SCHOOL_CALENDAR_EVENT_ID_PREFIX}${event.id}`,
				start,
				end,
				allDay: true,
				text: event.title,
				subject: '',
				room: '',
				teacher: '',
				kind: 'school-calendar',
				calendarType: event.type,
				css: schoolYearEventCss(event.type),
			});
			continue;
		}

		for (const date of schoolYearEventDatesInWeek(event, weekStart)) {
			const { start, end } = schoolCalendarDayInstants(date);
			mapped.push({
				id: `${SCHOOL_CALENDAR_EVENT_ID_PREFIX}${event.id}:${date}`,
				start,
				end,
				text: event.title,
				subject: '',
				room: '',
				teacher: '',
				kind: 'school-calendar',
				calendarType: event.type,
				css: schoolYearEventCss(event.type),
			});
		}
	}

	return mapped;
}
