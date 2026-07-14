import type { components } from '$lib/api/schema';
import { utcWallClockDate } from '$lib/components/school/scheduling/planning-calendar';

export type TeacherUnavailability = components['schemas']['TeacherUnavailability'];

/** Format a stored UTC instant for a `datetime-local` input (school UTC wall-clock). */
export function utcWallClockDateTimeInput(value: unknown): string {
	if (!value) {
		return '';
	}
	const date = utcWallClockDate(value instanceof Date ? value : new Date(String(value)));
	const year = date.getFullYear();
	const month = `${date.getMonth() + 1}`.padStart(2, '0');
	const day = `${date.getDate()}`.padStart(2, '0');
	const hours = `${date.getHours()}`.padStart(2, '0');
	const minutes = `${date.getMinutes()}`.padStart(2, '0');
	return `${year}-${month}-${day}T${hours}:${minutes}`;
}

/** Parse a `datetime-local` value as a UTC wall-clock instant for the API. */
export function utcWallClockInstantFromDateTimeInput(input: string): string | undefined {
	return input ? `${input}:00.000Z` : undefined;
}

export function buildTeacherUnavailabilityPayload(input: {
	id?: string;
	teacherId: string;
	academicYearId: string;
	recurrence: TeacherUnavailability['recurrence'];
	dayOfWeek?: TeacherUnavailability['dayOfWeek'];
	startTime?: string;
	endTime?: string;
	effectiveFrom?: string;
	effectiveUntil?: string;
	startsAt?: string;
	endsAt?: string;
	reason?: string;
	isActive?: boolean;
}): TeacherUnavailability {
	return {
		id: input.id ?? `tu-${Date.now().toString(36)}`,
		teacherId: input.teacherId,
		academicYearId: input.academicYearId,
		recurrence: input.recurrence,
		dayOfWeek: input.recurrence === 'weekly' ? (input.dayOfWeek ?? null) : null,
		startTime: input.recurrence === 'weekly' ? (input.startTime ?? null) : null,
		endTime: input.recurrence === 'weekly' ? (input.endTime ?? null) : null,
		effectiveFrom: input.recurrence === 'weekly' ? (input.effectiveFrom ?? null) : null,
		effectiveUntil: input.recurrence === 'weekly' ? (input.effectiveUntil ?? null) : null,
		startsAt: input.recurrence === 'one_off' ? (input.startsAt ?? null) : null,
		endsAt: input.recurrence === 'one_off' ? (input.endsAt ?? null) : null,
		reason: input.reason?.trim() || null,
		isActive: input.isActive ?? true,
	};
}
