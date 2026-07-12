import type { components } from '$lib/api/schema';
import type { getBrowserSchoolClient } from '$lib/api/school-client';
import type { School, SchoolType } from '$lib/types/school';

type SchoolClient = ReturnType<typeof getBrowserSchoolClient>;
export type SchoolRaw = components['schemas']['School'];

export const DEFAULT_SCHOOL_TIMEZONE = 'America/Toronto';

export function deriveSchoolShortName(name: string): string {
	const emDashParts = name.split('—');
	if (emDashParts.length > 1) {
		const tail = emDashParts[emDashParts.length - 1]?.trim();
		if (tail) {
			return tail;
		}
	}
	const hyphenParts = name.split(' - ');
	if (hyphenParts.length > 1) {
		const tail = hyphenParts[hyphenParts.length - 1]?.trim();
		if (tail) {
			return tail;
		}
	}
	return name.split(/\s+/)[0] ?? name;
}

export function mapSchoolFromApi(raw: SchoolRaw): School {
	return {
		id: raw.id,
		name: raw.name,
		shortName: deriveSchoolShortName(raw.name),
		city: raw.city ?? '',
		country: raw.country ?? undefined,
		timeZone: raw.timeZone,
		type: (raw.type ?? null) as SchoolType | null,
		timetableEnforceWorkloadFulfillment: raw.timetableEnforceWorkloadFulfillment,
		timetableExcludeBreakSlots: raw.timetableExcludeBreakSlots,
		timetableMinDayGapSameSubject: raw.timetableMinDayGapSameSubject,
		timetablePreferredPeriodDefinitionIds: raw.timetablePreferredPeriodDefinitionIds,
		timetableAllowUnassignedTeacherPlacements: raw.timetableAllowUnassignedTeacherPlacements,
		timetableUseHomeroomTeacherFallback: raw.timetableUseHomeroomTeacherFallback,
		timetableGenerationMode: raw.timetableGenerationMode,
		timetableMinPeriodSpan: raw.timetableMinPeriodSpan,
		timetableMaxPeriodSpan: raw.timetableMaxPeriodSpan,
	};
}

export async function fetchSchoolById(
	client: SchoolClient,
	schoolId: string,
): Promise<SchoolRaw | null> {
	try {
		return await client.entities.schools.get(schoolId);
	}
	catch {
		return null;
	}
}
