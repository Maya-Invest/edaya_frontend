import { describe, expect, it } from 'bun:test';
import { createEmptyDraft } from '$lib/onboarding/draft-storage';
import { isSchoolStepValid, validateSchoolStep } from '$lib/onboarding/school-step-validation';

describe('validateSchoolStep', () => {
	it('rejects an empty draft', () => {
		const draft = createEmptyDraft().school;
		const result = validateSchoolStep(draft);
		expect(result.valid).toBe(false);
		expect(result.missingFields).toContain('name');
		expect(result.missingFields).toContain('city');
	});

	it('accepts a draft with defaults filled in', () => {
		const draft = createEmptyDraft().school;
		draft.name = 'Collège EDAYA';
		draft.city = 'Lyon';
		expect(isSchoolStepValid(draft)).toBe(true);
	});

	it('rejects invalid date ranges', () => {
		const draft = createEmptyDraft().school;
		draft.name = 'Collège EDAYA';
		draft.city = 'Lyon';
		draft.academicYearStart = '2026-09-01';
		draft.academicYearEnd = '2025-06-30';
		expect(isSchoolStepValid(draft)).toBe(false);
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
