import {
	fetchClassAttendanceDaysSources,
	mapAttendanceDays,
} from '$lib/api/attendance-data';
import type { getBrowserSchoolClient } from '$lib/api/school-client';
import type { HomeroomAttendanceClassContext } from '$lib/school/homeroom-attendance-nudge';

type SchoolClient = ReturnType<typeof getBrowserSchoolClient>;

export async function loadHomeroomAttendanceByClass(
	client: SchoolClient,
	classIds: readonly string[],
): Promise<Map<string, HomeroomAttendanceClassContext>> {
	const entries = await Promise.all(classIds.map(async (classId) => {
		const { occurrencesRaw, recordsRaw, studentCount } = await fetchClassAttendanceDaysSources(
			client,
			classId,
		);
		return [classId, {
			days: mapAttendanceDays(occurrencesRaw, recordsRaw, studentCount),
			studentCount,
		}] as const;
	}));

	return new Map(entries);
}
