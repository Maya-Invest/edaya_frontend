import type { components } from '$lib/api/schema';

export type TimetablePlacementParameters = components['schemas']['TimetablePlacementParameters'];

export interface TimetablePlacementOverrides {
	periodsPerWeekByClassSubjectId?: Record<string, number>;
	minPeriodSpanByClassSubjectId?: Record<string, number>;
	maxPeriodSpanByClassSubjectId?: Record<string, number>;
}

export function buildTimetablePlacementParameters(
	overrides: TimetablePlacementOverrides,
): TimetablePlacementParameters | undefined {
	const placementParameters: TimetablePlacementParameters = {};
	if (overrides.periodsPerWeekByClassSubjectId
		&& Object.keys(overrides.periodsPerWeekByClassSubjectId).length > 0) {
		placementParameters.periodsPerWeekByClassSubjectId = overrides.periodsPerWeekByClassSubjectId;
	}
	if (overrides.minPeriodSpanByClassSubjectId
		&& Object.keys(overrides.minPeriodSpanByClassSubjectId).length > 0) {
		placementParameters.minPeriodSpanByClassSubjectId = overrides.minPeriodSpanByClassSubjectId;
	}
	if (overrides.maxPeriodSpanByClassSubjectId
		&& Object.keys(overrides.maxPeriodSpanByClassSubjectId).length > 0) {
		placementParameters.maxPeriodSpanByClassSubjectId = overrides.maxPeriodSpanByClassSubjectId;
	}
	return Object.keys(placementParameters).length > 0 ? placementParameters : undefined;
}

export function resolvedPeriodSpanPlaceholder(
	classSubject: { minPeriodSpan?: number | null; maxPeriodSpan?: number | null },
	school?: { timetableMinPeriodSpan?: number; timetableMaxPeriodSpan?: number },
): { min: number; max: number } {
	return {
		min: classSubject.minPeriodSpan ?? school?.timetableMinPeriodSpan ?? 1,
		max: classSubject.maxPeriodSpan ?? school?.timetableMaxPeriodSpan ?? 1,
	};
}
