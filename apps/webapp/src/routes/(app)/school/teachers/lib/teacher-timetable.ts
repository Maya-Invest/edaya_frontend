import type { components } from '$lib/api/schema';
import { isoToZonedDateAndTime, civilDateTimeInTimeZoneToIso } from '$lib/date/format';

export type TeacherTimetableEvent = components['schemas']['TimetableEvent'];
export interface TeacherTimetableContext {
	schoolId: string;
	academicYearId: string;
	startDate: string;
	endDate: string;
	timeZone: string;
}
export interface TeacherTimetableDay {
	date: string;
	events: TeacherTimetableEvent[];
}

export function validTimetableDate(value: string | null | undefined): value is string {
	if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value))
		return false;
	const parsed = new Date(`${value}T00:00:00Z`);
	return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}

export function teacherTimetableContextKey(context: TeacherTimetableContext): string {
	return JSON.stringify([context.schoolId, context.academicYearId, context.startDate, context.endDate, context.timeZone]);
}

export function timetableTargetDate(params: URLSearchParams, today: string, context: TeacherTimetableContext): string {
	const requested = params.get('date') ?? params.get('week');
	const date = validTimetableDate(requested) ? requested : today;
	return date < context.startDate ? context.startDate : date > context.endDate ? context.endDate : date;
}

/** The API accepts inclusive UTC dates; include every instant in the school's civil year. */
export function teacherTimetableQueryRange(context: TeacherTimetableContext) {
	const nextDay = new Date(`${context.endDate}T00:00:00Z`);
	nextDay.setUTCDate(nextDay.getUTCDate() + 1);
	const endExclusive = civilDateTimeInTimeZoneToIso(nextDay.toISOString().slice(0, 10), '00:00', context.timeZone);
	return {
		startDate: civilDateTimeInTimeZoneToIso(context.startDate, '00:00', context.timeZone).slice(0, 10),
		endDate: new Date(new Date(endExclusive).getTime() - 1).toISOString().slice(0, 10),
	};
}

export function teacherTimetableDays(events: readonly TeacherTimetableEvent[], context: TeacherTimetableContext, target?: string): TeacherTimetableDay[] {
	const byDate = new Map<string, TeacherTimetableEvent[]>();
	for (const event of events) {
		const { date } = isoToZonedDateAndTime(event.startsAt, context.timeZone);
		if (date < context.startDate || date > context.endDate)
			continue;
		const group = byDate.get(date) ?? [];
		group.push(event);
		byDate.set(date, group);
	}
	if (target && target >= context.startDate && target <= context.endDate && !byDate.has(target))
		byDate.set(target, []);
	return [...byDate.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([date, rows]) => ({
		date,
		events: rows.sort((a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime() || a.kind.localeCompare(b.kind) || a.id.localeCompare(b.id)),
	}));
}
