import { describe, expect, test } from 'bun:test';
import {
	buildTimetablePlacementParameters,
	resolvePeriodsPerWeek,
	resolvedPeriodsPerWeekPlaceholder,
	setPeriodsPerWeekOverride,
} from '$lib/components/school/scheduling/timetable-placement-parameters';

describe('timetable placement parameters', () => {
	test('builds placement parameters from explicit overrides', () => {
		expect(buildTimetablePlacementParameters({
			periodsPerWeekByClassSubjectId: { 'cs-math': 4 },
		})).toEqual({
			periodsPerWeekByClassSubjectId: { 'cs-math': 4 },
		});
	});

	test('returns undefined when no overrides are provided', () => {
		expect(buildTimetablePlacementParameters({})).toBeUndefined();
	});

	test('fills default periods per week for all offered class subjects', () => {
		expect(buildTimetablePlacementParameters(
			{ periodsPerWeekByClassSubjectId: { 'cs-math': 4 } },
			[
				{ id: 'cs-math', periodsPerWeek: 3 },
				{ id: 'cs-fr' },
				{ id: 'cs-opt', isOffered: false },
			],
		)).toEqual({
			periodsPerWeekByClassSubjectId: { 'cs-math': 4, 'cs-fr': 1 },
		});
	});

	test('resolves periods per week placeholder from class subject or defaults to 1', () => {
		expect(resolvedPeriodsPerWeekPlaceholder({ periodsPerWeek: 4 })).toBe(4);
		expect(resolvedPeriodsPerWeekPlaceholder({})).toBe(1);
		expect(resolvedPeriodsPerWeekPlaceholder({ periodsPerWeek: null })).toBe(1);
		expect(resolvePeriodsPerWeek(0, { periodsPerWeek: 0 })).toBe(1);
	});

	test('ignores invalid override values', () => {
		expect(setPeriodsPerWeekOverride({ 'cs-math': 2 }, 'cs-math', '')).toEqual({});
		expect(setPeriodsPerWeekOverride({}, 'cs-math', '0')).toEqual({});
		expect(setPeriodsPerWeekOverride({}, 'cs-math', '3')).toEqual({ 'cs-math': 3 });
	});
});
