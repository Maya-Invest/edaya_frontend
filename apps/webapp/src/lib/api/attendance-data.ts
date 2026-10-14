import type { components } from '$lib/api/schema';
import type { getBrowserSchoolClient } from '$lib/api/school-client';
import type { AttendanceDay } from '$lib/types/school';
import type { SessionAttendanceRow, SessionDetail } from '$lib/types/session-detail';
import {
	activeEnrollmentsForClass,
	attendancesForClass,
	listAllEntityPages,
	listAllEntityPagesByIds,
	listAllEntityPagesForIdFilters,
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
		safeEntityList(() => listAllEntityPages(
			query => client.entities.attendances.list(query),
			{ baseQuery: attendancesForClass(classGroupId) },
		)),
		safeEntityList(() => listAllEntityPages(
			query => client.entities.enrollments.list(query),
			{ baseQuery: activeEnrollmentsForClass(classGroupId) },
		)),
	]);

	const occurrenceIds = occurrencesRaw.map(occurrence => occurrence.id);
	const recordsRaw = await listAllEntityPagesForIdFilters(
		query => client.entities.attendance.list(query),
		[{ field: 'attendanceId', ids: occurrenceIds }],
	);

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

export async function loadClassAttendancePageData(
	client: SchoolClient,
	classGroupId: string,
): Promise<{ attendanceDays: AttendanceDay[] }> {
	const { occurrencesRaw, recordsRaw, studentCount } = await fetchClassAttendanceDaysSources(
		client,
		classGroupId,
	);
	return {
		attendanceDays: mapAttendanceDays(occurrencesRaw, recordsRaw, studentCount),
	};
}

export async function loadAttendanceDayDetail(
	client: SchoolClient,
	occurrenceId: string,
): Promise<SessionDetail | null> {
	let occurrence: AttendanceOccurrenceRaw;
	try {
		occurrence = await client.entities.attendances.get(occurrenceId);
	}
	catch {
		return null;
	}

	const classStudents = mapStudents(await fetchClassPeopleSources(client, occurrence.classGroupId));
	const attendanceRaw = await listAllEntityPagesForIdFilters(
		query => client.entities.attendance.list(query),
		[{ field: 'attendanceId', ids: [occurrenceId] }],
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

/** Attendance needs the complete active roster, without guardian read permissions. */
export async function loadAttendanceRoster(client: SchoolClient, classGroupId: string): Promise<SessionAttendanceRow[]> {
	const enrollments = await listAllEntityPages(
		query => client.entities.enrollments.list(query),
		{ baseQuery: activeEnrollmentsForClass(classGroupId) },
	);
	const ids = [...new Set(enrollments.map(row => row.studentId))];
	const students = await listAllEntityPagesByIds(query => client.entities.students.list(query), ids);
	if (ids.some(id => !students.some(student => student.id === id))) {
		throw new Error('Incomplete attendance roster');
	}
	return students.map(student => ({
		studentId: student.id,
		studentName: `${student.firstName} ${student.lastName}`.trim(),
		studentInitials: `${student.firstName[0] ?? ''}${student.lastName[0] ?? ''}`,
	})).sort((a, b) => a.studentName.localeCompare(b.studentName));
}

/** Unlike display enrichment, the duplicate check must fail closed on read errors. */
export async function findAttendanceDayForDate(client: SchoolClient, classGroupId: string, date: string): Promise<AttendanceDay | undefined> {
	const occurrences = await listAllEntityPages(
		query => client.entities.attendances.list(query),
		{ baseQuery: attendancesForClass(classGroupId) },
	);
	const occurrence = occurrences.find(row => formatDate(row.startsAt) === date);
	return occurrence ? mapAttendanceOccurrenceToDay(occurrence, 0, []) : undefined;
}
