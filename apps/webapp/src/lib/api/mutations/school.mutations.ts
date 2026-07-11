import type { SchoolRaw } from '$lib/api/school-data';
import type { School, SchoolType } from '$lib/types/school';
import { academicContext } from '$lib/academic/context.svelte';
import { runMutation } from '$lib/api/mutations/run-mutation';
import { getBrowserSchoolClient } from '$lib/api/school-client';
import { mapSchoolFromApi } from '$lib/api/school-data';

export interface UpdateSchoolSettingsInput {
	id: string;
	name: string;
	timeZone: string;
	city?: string | null;
	country?: string | null;
	type?: SchoolType | null;
}

export async function updateSchoolSettingsMutation(
	input: UpdateSchoolSettingsInput,
	options?: {
		current?: SchoolRaw | null;
		successMessage?: string;
	},
): Promise<{ school: School; raw: SchoolRaw } | null> {
	const client = getBrowserSchoolClient();
	const current = options?.current;

	const result = await runMutation(
		() => client.entities.schools.save({
			id: input.id,
			name: input.name.trim(),
			timeZone: input.timeZone.trim(),
			city: input.city?.trim() || null,
			country: input.country?.trim() || null,
			type: input.type ?? null,
			ownerSubjectId: current?.ownerSubjectId ?? undefined,
			enforceScheduleConflicts: current?.enforceScheduleConflicts ?? false,
			timetableEnforceWorkloadFulfillment: current?.timetableEnforceWorkloadFulfillment ?? true,
			timetableExcludeBreakSlots: current?.timetableExcludeBreakSlots ?? true,
			timetableMinPeriodGapSameSubject: current?.timetableMinPeriodGapSameSubject ?? 2,
			timetablePreferredPeriodDefinitionIds: current?.timetablePreferredPeriodDefinitionIds ?? [],
		}),
		{ successMessage: options?.successMessage },
	);

	if (!result) {
		return null;
	}

	const school = mapSchoolFromApi(result);
	academicContext.updateSchool(school);
	return { school, raw: result };
}
