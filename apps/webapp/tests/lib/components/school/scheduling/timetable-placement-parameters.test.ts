import { describe, expect, test } from 'bun:test';
import {
	buildTimetablePlacementParameters,
	resolvedPeriodSpanPlaceholder,
} from '$lib/components/school/scheduling/timetable-placement-parameters';

describe('timetable placement parameters', () => {
	test('builds placement parameters from non-empty override maps', () => {
		expect(buildTimetablePlacementParameters({
			periodsPerWeekByClassSubjectId: { 'cs-math': 4 },
			minPeriodSpanByClassSubjectId: { 'cs-math': 1 },
			maxPeriodSpanByClassSubjectId: { 'cs-math': 2 },
		})).toEqual({
			periodsPerWeekByClassSubjectId: { 'cs-math': 4 },
			minPeriodSpanByClassSubjectId: { 'cs-math': 1 },
			maxPeriodSpanByClassSubjectId: { 'cs-math': 2 },
		});
	});

	test('returns undefined when no overrides are provided', () => {
		expect(buildTimetablePlacementParameters({})).toBeUndefined();
	});

	test('resolves span placeholders from class subject then school defaults', () => {
		expect(resolvedPeriodSpanPlaceholder(
			{ minPeriodSpan: 2, maxPeriodSpan: 3 },
			{ timetableMinPeriodSpan: 1, timetableMaxPeriodSpan: 1 },
		)).toEqual({ min: 2, max: 3 });

		expect(resolvedPeriodSpanPlaceholder(
			{},
			{ timetableMinPeriodSpan: 1, timetableMaxPeriodSpan: 2 },
		)).toEqual({ min: 1, max: 2 });
	});
});
