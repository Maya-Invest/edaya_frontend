import type { SchoolRaw } from '$lib/api/school-data';
import type { School, SchoolType } from '$lib/types/school';
import { academicContext } from '$lib/academic/context.svelte';
import { runMutation } from '$lib/api/mutations/run-mutation';
import { getBrowserSchoolClient } from '$lib/api/school-client';
import { mapSchoolFromApi, schoolConfigurationIdentityFields } from '$lib/api/school-data';

export interface UpdateSchoolSettingsInput {
	id: string;
	name: string;
	timeZone: string;
	city?: string | null;
	country?: string | null;
	type?: SchoolType | null;
	issuingName?: string | null;
	postalAddress?: string | null;
	phone?: string | null;
	email?: string | null;
	schoolCode?: string | null;
	publicBrandingPurposes?: Array<'school.logo' | 'school.crest'>;
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
		() => client.commands.updateSchoolConfiguration({
			schoolId: input.id,
			name: input.name.trim(),
			timeZone: input.timeZone.trim(),
			city: input.city?.trim() || null,
			country: input.country?.trim() || null,
			type: input.type ?? null,
			ownerSubjectId: current?.ownerSubjectId ?? undefined,
			enforceScheduleConflicts: current?.enforceScheduleConflicts ?? false,
			timetableEnforceWorkloadFulfillment: current?.timetableEnforceWorkloadFulfillment ?? true,
			timetableExcludeBreakSlots: current?.timetableExcludeBreakSlots ?? true,
			timetableMinDayGapSameSubject: current?.timetableMinDayGapSameSubject ?? 1,
			timetablePreferredPeriodDefinitionIds: current?.timetablePreferredPeriodDefinitionIds ?? [],
			timetableAllowUnassignedTeacherPlacements: current?.timetableAllowUnassignedTeacherPlacements ?? false,
			timetableUseHomeroomTeacherFallback: current?.timetableUseHomeroomTeacherFallback ?? false,
			timetableGenerationMode: current?.timetableGenerationMode ?? 'weekly',
			timetableMinPeriodSpan: current?.timetableMinPeriodSpan ?? 1,
			timetableMaxPeriodSpan: current?.timetableMaxPeriodSpan ?? 1,
			...(current
				? {
						...schoolConfigurationIdentityFields(current),
						issuingName: input.issuingName ?? current.issuingName ?? null,
						postalAddress: input.postalAddress ?? current.postalAddress ?? null,
						phone: input.phone ?? current.phone ?? null,
						email: input.email ?? current.email ?? null,
						schoolCode: input.schoolCode ?? current.schoolCode ?? null,
						publicBrandingPurposes: input.publicBrandingPurposes ?? current.publicBrandingPurposes ?? [],
					}
				: {}),
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
