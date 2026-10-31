import { describe, expect, it } from 'bun:test';
import { createEmptyDraft } from '$lib/onboarding/draft-storage';
import {
	createDefaultPeriod,
	createInitialPeriods,
	normalizePeriodCount,
	periodCount,
	setPeriodType,
} from '$lib/onboarding/school-periods';
import { isSchoolStepValid } from '$lib/onboarding/school-step-validation';

describe('school-periods', () => {
	it('fixes three trimesters or two semesters', () => {
		expect(periodCount('trimester')).toBe(3);
		expect(periodCount('semester')).toBe(2);
	});

	it('starts with exactly three trimesters', () => {
		const school = createEmptyDraft().school;
		expect(school.periods.map(period => period.label)).toEqual(['Trimestre 1', 'Trimestre 2', 'Trimestre 3']);
	});

	it('replaces the complete calendar when switching between types', () => {
		const original = createEmptyDraft().school;
		const semesters = setPeriodType(original, 'semester');
		expect(semesters.periodType).toBe('semester');
		expect(semesters.periods.map(period => period.label)).toEqual(['Semestre 1', 'Semestre 2']);
		expect(semesters.periods[0]?.start).toBe(original.academicYearStart);
		expect(semesters.periods[1]?.end).toBe(original.academicYearEnd);
		expect(semesters.periods.every(period => !original.periods.some(old => old.id === period.id))).toBe(true);
		expect(setPeriodType(semesters, 'trimester').periods).toHaveLength(3);
	});

	it('preserves edited periods when the selected type has not changed', () => {
		const school = createEmptyDraft().school;
		school.periods[0]!.label = 'Custom term';
		expect(setPeriodType(school, 'trimester')).toBe(school);
	});

	it('restores a partial saved calendar without changing its edited first period', () => {
		const school = createEmptyDraft().school;
		school.periods = [{ ...school.periods[0]!, label: 'Edited term', end: '2026-12-18' }];
		const restored = normalizePeriodCount(school);
		expect(restored.periods).toHaveLength(3);
		expect(restored.periods[0]).toEqual(school.periods[0]);
		expect(restored.periods[1]!.label).toBe('Trimestre 2');
	});

	it('populates ordered, bounded calendars for a non-standard academic year', () => {
		for (const type of ['trimester', 'semester'] as const) {
			const periods = createInitialPeriods(type, '2026-01-01', '2026-06-30');
			expect(periods).toHaveLength(periodCount(type));
			expect(periods[0]!.start).toBe('2026-01-01');
			expect(periods.at(-1)!.end).toBe('2026-06-30');
			expect(new Set(periods.map(period => period.id)).size).toBe(periods.length);
			const school = { ...createEmptyDraft().school, name: 'School', city: 'City', financeCurrency: 'XOF', academicYearStart: '2026-01-01', academicYearEnd: '2026-06-30', periodType: type, periods };
			expect(isSchoolStepValid(school)).toBe(true);
		}
	});
});

describe('validateSchoolStep periods', () => {
	it('accepts multiple valid trimesters', () => {
		const draft = createEmptyDraft().school;
		draft.name = 'Collège EDAYA';
		draft.city = 'Lyon';
		draft.financeCurrency = 'EUR';
		draft.periods = [
			createDefaultPeriod('trimester', 0, draft.academicYearStart, draft.academicYearEnd),
			createDefaultPeriod('trimester', 1, draft.academicYearStart, draft.academicYearEnd),
		];
		expect(isSchoolStepValid(draft)).toBe(true);
	});

	it('rejects a period outside the academic year', () => {
		const draft = createEmptyDraft().school;
		draft.name = 'Collège EDAYA';
		draft.city = 'Lyon';
		draft.financeCurrency = 'EUR';
		draft.academicYearStart = '2026-07-02';
		draft.academicYearEnd = '2026-07-11';
		draft.periods = [{
			id: 'p1',
			label: 'Trimestre 1',
			start: '2026-07-14',
			end: '2026-08-27',
		}];
		expect(isSchoolStepValid(draft)).toBe(false);
	});
});
