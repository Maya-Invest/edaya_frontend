import type { SchoolRaw } from '$lib/api/school-data';
import type { School } from '$lib/types/school';
import { academicContext } from '$lib/academic/context.svelte';
import { runMutation } from '$lib/api/mutations/run-mutation';
import { getBrowserSchoolClient } from '$lib/api/school-client';
import { mapSchoolFromApi } from '$lib/api/school-data';
import { t } from '$lib/i18n';
import { toast } from '$lib/toast.svelte';
import { get } from 'svelte/store';

export interface SchoolTimetableDefaultsInput {
	schoolId: string;
	timetableEnforceWorkloadFulfillment: boolean;
	timetableExcludeBreakSlots: boolean;
	timetableAllowUnassignedTeacherPlacements: boolean;
	timetableUseHomeroomTeacherFallback: boolean;
	timetableMinDayGapSameSubject: number;
	timetableMinPeriodSpan: number;
	timetableMaxPeriodSpan: number;
}

export async function updateSchoolTimetableDefaultsMutation(input: {
	schoolId: string;
	defaults: SchoolTimetableDefaultsInput;
	current?: SchoolRaw | null;
	successMessage?: string;
}): Promise<{ school: School; raw: SchoolRaw } | null> {
	const { defaults } = input;
	if (!Number.isInteger(defaults.timetableMinPeriodSpan) || defaults.timetableMinPeriodSpan <= 0
		|| !Number.isInteger(defaults.timetableMaxPeriodSpan) || defaults.timetableMaxPeriodSpan <= 0) {
		toast.error(get(t)('timetable.periodSpanInvalid'));
		return null;
	}
	if (defaults.timetableMaxPeriodSpan < defaults.timetableMinPeriodSpan) {
		toast.error(get(t)('timetable.periodSpanRangeInvalid'));
		return null;
	}
	if (!Number.isInteger(defaults.timetableMinDayGapSameSubject) || defaults.timetableMinDayGapSameSubject < 0) {
		toast.error(get(t)('timetable.sameSubjectDayGapInvalid'));
		return null;
	}

	const client = getBrowserSchoolClient();
	const current = input.current;
	if (!current) {
		toast.error(get(t)('dataState.errorDescription'));
		return null;
	}

	const result = await runMutation(
		() => client.commands.updateSchoolConfiguration({
			schoolId: input.schoolId,
			name: current.name,
			timeZone: current.timeZone,
			city: current.city,
			country: current.country,
			type: current.type,
			ownerSubjectId: current.ownerSubjectId,
			enforceScheduleConflicts: current.enforceScheduleConflicts,
			timetableEnforceWorkloadFulfillment: defaults.timetableEnforceWorkloadFulfillment,
			timetableExcludeBreakSlots: defaults.timetableExcludeBreakSlots,
			timetableMinDayGapSameSubject: defaults.timetableMinDayGapSameSubject,
			timetablePreferredPeriodDefinitionIds: current.timetablePreferredPeriodDefinitionIds,
			timetableAllowUnassignedTeacherPlacements: defaults.timetableAllowUnassignedTeacherPlacements,
			timetableUseHomeroomTeacherFallback: defaults.timetableUseHomeroomTeacherFallback,
			timetableGenerationMode: current.timetableGenerationMode,
			timetableMinPeriodSpan: defaults.timetableMinPeriodSpan,
			timetableMaxPeriodSpan: defaults.timetableMaxPeriodSpan,
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
