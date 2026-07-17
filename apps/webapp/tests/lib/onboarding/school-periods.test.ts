import { describe, expect, it } from 'bun:test';
import { createEmptyDraft } from '$lib/onboarding/draft-storage';
import {
	addPeriod,
	canAddPeriod,
	createDefaultPeriod,
	maxPeriodCount,
	removePeriod,
	setPeriodType,
} from '$lib/onboarding/school-periods';
import { isSchoolStepValid } from '$lib/onboarding/school-step-validation';

describe('school-periods', () => {
	it('allows up to three trimesters or two semesters', () => {
		expect(maxPeriodCount('trimester')).toBe(3);
		expect(maxPeriodCount('semester')).toBe(2);
	});

	it('adds trimesters sequentially with default labels', () => {
		let school = createEmptyDraft().school;
		expect(school.periods).toHaveLength(1);
		expect(school.periods[0]?.label).toBe('Trimestre 1');

		school = addPeriod(school);
		expect(school.periods[1]?.label).toBe('Trimestre 2');

		school = addPeriod(school);
		expect(school.periods).toHaveLength(3);
		expect(canAddPeriod(school)).toBe(false);
	});

	it('resets periods when switching type', () => {
		let school = addPeriod(createEmptyDraft().school);
		school = setPeriodType(school, 'semester');
		expect(school.periodType).toBe('semester');
		expect(school.periods).toHaveLength(1);
		expect(school.periods[0]?.label).toBe('Semestre 1');
	});

	it('keeps at least one period when removing', () => {
		let school = addPeriod(createEmptyDraft().school);
		const secondId = school.periods[1]!.id;
		school = removePeriod(school, secondId);
		expect(school.periods).toHaveLength(1);
		school = removePeriod(school, school.periods[0]!.id);
		expect(school.periods).toHaveLength(1);
	});
});

describe('validateSchoolStep periods', () => {
	it('accepts multiple valid trimesters', () => {
		const draft = createEmptyDraft().school;
		draft.name = 'Collège EDAYA';
		draft.city = 'Lyon';
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
