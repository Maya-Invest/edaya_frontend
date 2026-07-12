import type { SchoolRaw } from '$lib/api/school-data';
import type { School } from '$lib/types/school';
import { academicContext } from '$lib/academic/context.svelte';
import { runMutation } from '$lib/api/mutations/run-mutation';
import { getBrowserSchoolClient } from '$lib/api/school-client';
import { mapSchoolFromApi } from '$lib/api/school-data';
import { t } from '$lib/i18n';
import { toast } from '$lib/toast.svelte';
import { get } from 'svelte/store';

export async function updateSchoolTimetableSpanDefaultsMutation(input: {
	schoolId: string;
	timetableMinPeriodSpan: number;
	timetableMaxPeriodSpan: number;
	current?: SchoolRaw | null;
	successMessage?: string;
}): Promise<{ school: School; raw: SchoolRaw } | null> {
	if (!Number.isInteger(input.timetableMinPeriodSpan) || input.timetableMinPeriodSpan <= 0
		|| !Number.isInteger(input.timetableMaxPeriodSpan) || input.timetableMaxPeriodSpan <= 0) {
		toast.error(get(t)('timetable.periodSpanInvalid'));
		return null;
	}
	if (input.timetableMaxPeriodSpan < input.timetableMinPeriodSpan) {
		toast.error(get(t)('timetable.periodSpanRangeInvalid'));
		return null;
	}

	const client = getBrowserSchoolClient();
	const current = input.current;
	if (!current) {
		toast.error(get(t)('dataState.errorDescription'));
		return null;
	}

	const result = await runMutation(
		() => client.entities.schools.save({
			id: input.schoolId,
			name: current.name,
			timeZone: current.timeZone,
			city: current.city,
			country: current.country,
			type: current.type,
			ownerSubjectId: current.ownerSubjectId,
			enforceScheduleConflicts: current.enforceScheduleConflicts,
			timetableEnforceWorkloadFulfillment: current.timetableEnforceWorkloadFulfillment,
			timetableExcludeBreakSlots: current.timetableExcludeBreakSlots,
			timetableMinDayGapSameSubject: current.timetableMinDayGapSameSubject,
			timetablePreferredPeriodDefinitionIds: current.timetablePreferredPeriodDefinitionIds,
			timetableAllowUnassignedTeacherPlacements: current.timetableAllowUnassignedTeacherPlacements,
			timetableUseHomeroomTeacherFallback: current.timetableUseHomeroomTeacherFallback,
			timetableGenerationMode: current.timetableGenerationMode,
			timetableMinPeriodSpan: input.timetableMinPeriodSpan,
			timetableMaxPeriodSpan: input.timetableMaxPeriodSpan,
		}),
		{ successMessage: input.successMessage },
	);

	if (!result) {
		return null;
	}

	const school = mapSchoolFromApi(result);
	academicContext.updateSchool(school);
	return { school, raw: result };
}
