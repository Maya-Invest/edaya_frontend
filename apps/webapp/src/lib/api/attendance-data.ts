import type { components } from '$lib/api/schema';
import type { getBrowserSchoolClient } from '$lib/api/school-client';
import type { AttendanceDay } from '$lib/types/school';
import type { SessionDetail } from '$lib/types/session-detail';
import {
	activeEnrollmentsForClass,
	attendanceRecordsForOccurrences,
	attendancesForClass,
} from '$lib/api/entity-list-filters';
import { mapStudents, fetchClassPeopleSources } from '$lib/api/people-data';
import { buildOccurrenceAttendanceDetail } from '$lib/api/session-detail-data';
import { ApiError } from '@maya-invest/edaya-api-client';

type SchoolClient = ReturnType<typeof getBrowserSchoolClient>;
type AttendanceOccurrenceRaw = components['schemas']['AttendanceOccurrence'];
type AttendanceRaw = components['schemas']['Attendance'];

async function safeEntityList<T>(load: () => Promise<T[] | null | undefined>): Promise<T[]> {
	try {
		return (await load()) ?? [];
	}
	catch (error) {
		if (error instanceof ApiError && (error.status === 403 || error.status === 401)) {
			return [];
		}
		if (error instanceof TypeError) {
			return [];
		}
		throw error;
	}
}

function formatDate(value: unknown): string {
	if (!value) {
		return '';
	}
	if (value instanceof Date) {
		return value.toISOString().slice(0, 10);
	}
	if (typeof value === 'string') {
		return value.slice(0, 10);
	}
	return String(value).slice(0, 10);
}

/** Stable id used by backend `getOrCreateAttendance` for daily roll call. */
export function dailyAttendanceOccurrenceId(classGroupId: string, dateIso: string): string {
	return `${classGroupId}:${dateIso}`;
}

export function parseDailyAttendanceOccurrenceId(occurrenceId: string): {
	classGroupId: string;
	dateIso: string;
} | null {
	const separator = occurrenceId.lastIndexOf(':');
	if (separator <= 0 || separator === occurrenceId.length - 1) {
		return null;
	}
	const classGroupId = occurrenceId.slice(0, separator);
	const dateIso = occurrenceId.slice(separator + 1);
	if (!/^\d{4}-\d{2}-\d{2}$/.test(dateIso)) {
		return null;
	}
	return { classGroupId, dateIso };
}

export function mapAttendanceOccurrenceToDay(
	occurrence: AttendanceOccurrenceRaw,
	studentCount: number,
	records: readonly AttendanceRaw[],
): AttendanceDay {
	const recordedCount = records.filter(record => record.attendanceId === occurrence.id).length;
	return {
		id: occurrence.id,
		classId: occurrence.classGroupId,
		date: formatDate(occurrence.startsAt),
		label: occurrence.displayLabel,
		totalStudents: studentCount,
		recordedCount,
	};
}

export async function fetchClassAttendanceDaysSources(
	client: SchoolClient,
	classGroupId: string,
): Promise<{
	occurrencesRaw: AttendanceOccurrenceRaw[];
	recordsRaw: AttendanceRaw[];
	studentCount: number;
}> {
	const [occurrencesRaw, enrollmentsRaw] = await Promise.all([
		safeEntityList(() => client.entities.attendances.list(attendancesForClass(classGroupId))),
		safeEntityList(() => client.entities.enrollments.list(activeEnrollmentsForClass(classGroupId))),
	]);

	const occurrenceIds = occurrencesRaw.map(occurrence => occurrence.id);
	const recordsRaw = occurrenceIds.length > 0
		? await safeEntityList(() => client.entities.attendance.list(attendanceRecordsForOccurrences(occurrenceIds)))
		: [];

	return {
		occurrencesRaw,
		recordsRaw,
		studentCount: enrollmentsRaw.length,
	};
}

export function mapAttendanceDays(
	occurrencesRaw: AttendanceOccurrenceRaw[],
	recordsRaw: AttendanceRaw[],
	studentCount: number,
): AttendanceDay[] {
	return occurrencesRaw
		.map(occurrence => mapAttendanceOccurrenceToDay(occurrence, studentCount, recordsRaw))
		.sort((a, b) => b.date.localeCompare(a.date) || b.label.localeCompare(a.label));
}

/** Ensure today's roll-call row exists so the list is never empty for daily-mode classes. */
export function ensureTodayAttendanceDay(
	days: readonly AttendanceDay[],
	classGroupId: string,
	studentCount: number,
	todayIso = new Date().toISOString().slice(0, 10),
): AttendanceDay[] {
	if (days.some(day => day.date === todayIso)) {
		return [...days];
	}
	return [
		{
			id: dailyAttendanceOccurrenceId(classGroupId, todayIso),
			classId: classGroupId,
			date: todayIso,
			label: 'Daily attendance',
			totalStudents: studentCount,
			recordedCount: 0,
		},
		...days,
	];
}

export async function loadClassAttendancePageData(
	client: SchoolClient,
	classGroupId: string,
): Promise<{ attendanceDays: AttendanceDay[] }> {
	const { occurrencesRaw, recordsRaw, studentCount } = await fetchClassAttendanceDaysSources(
		client,
		classGroupId,
	);
	return {
		attendanceDays: ensureTodayAttendanceDay(
			mapAttendanceDays(occurrencesRaw, recordsRaw, studentCount),
			classGroupId,
			studentCount,
		),
	};
}

export async function loadAttendanceDayDetail(
	client: SchoolClient,
	occurrenceId: string,
): Promise<SessionDetail | null> {
	let occurrence: AttendanceOccurrenceRaw | null = null;
	try {
		occurrence = await client.entities.attendances.get(occurrenceId);
	}
	catch {
		occurrence = null;
	}

	if (!occurrence) {
		const parsed = parseDailyAttendanceOccurrenceId(occurrenceId);
		if (!parsed) {
			return null;
		}
		const classStudents = mapStudents(await fetchClassPeopleSources(client, parsed.classGroupId));
		return buildOccurrenceAttendanceDetail({
			occurrenceId,
			classGroupId: parsed.classGroupId,
			classSubjectId: '',
			startsAt: parsed.dateIso,
			students: classStudents,
			attendanceRaw: [],
			displayLabel: 'Daily attendance',
		});
	}

	const classStudents = mapStudents(await fetchClassPeopleSources(client, occurrence.classGroupId));
	const attendanceRaw = await client.entities.attendance.list(
		attendanceRecordsForOccurrences([occurrenceId]),
	);

	return buildOccurrenceAttendanceDetail({
		occurrenceId: occurrence.id,
		classGroupId: occurrence.classGroupId,
		classSubjectId: '',
		startsAt: occurrence.startsAt,
		students: classStudents,
		attendanceRaw: attendanceRaw ?? [],
		displayLabel: occurrence.displayLabel,
	});
}
