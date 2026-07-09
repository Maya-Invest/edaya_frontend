import type { getBrowserSchoolClient } from '$lib/api/school-client';
import type { HomeroomAttendanceClassContext } from '$lib/school/homeroom-attendance-nudge';
import {
	fetchClassAttendanceDaysSources,
	mapAttendanceDays,
} from '$lib/api/attendance-data';

type SchoolClient = ReturnType<typeof getBrowserSchoolClient>;

export async function loadHomeroomAttendanceByClass(
	client: SchoolClient,
	classIds: readonly string[],
	fallbackStudentCounts: Readonly<Record<string, number>> = {},
): Promise<Map<string, HomeroomAttendanceClassContext>> {
	const entries = await Promise.all(classIds.map(async (classId) => {
		const { occurrencesRaw, recordsRaw, studentCount } = await fetchClassAttendanceDaysSources(
			client,
			classId,
		);
		const resolvedStudentCount = Math.max(studentCount, fallbackStudentCounts[classId] ?? 0);
		return [classId, {
			days: mapAttendanceDays(occurrencesRaw, recordsRaw, resolvedStudentCount),
			studentCount: resolvedStudentCount,
		}] as const;
	}));

	return new Map(entries);
}
