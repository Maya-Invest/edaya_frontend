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
		draft.financeCurrency = 'EUR';
		expect(isSchoolStepValid(draft)).toBe(true);
	});

	it('does not require a user-entered academic year label', () => {
		const draft = createEmptyDraft().school;
		draft.name = 'Collège EDAYA';
		draft.city = 'Lyon';
		draft.financeCurrency = 'EUR';
		draft.academicYearLabel = '';
		expect(isSchoolStepValid(draft)).toBe(true);
		expect(validateSchoolStep(draft).missingFields).not.toContain('academicYearLabel');
	});

	it('requires an explicit finance currency', () => {
		const draft = createEmptyDraft().school;
		draft.name = 'School';
		draft.city = 'City';
		expect(validateSchoolStep(draft).missingFields).toContain('financeCurrency');
	});

	it('rejects invalid date ranges', () => {
		const draft = createEmptyDraft().school;
		draft.name = 'Collège EDAYA';
		draft.city = 'Lyon';
		draft.financeCurrency = 'EUR';
		draft.academicYearStart = '2026-09-01';
		draft.academicYearEnd = '2025-06-30';
		expect(isSchoolStepValid(draft)).toBe(false);
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

it('rejects impossible dates, duplicate names, overlap and dates outside the academic year', () => {
 const school = createEmptyDraft().school;
 school.name = 'École'; school.city = 'Abidjan'; school.financeCurrency = 'XOF';
 school.academicYearStart = '2026-09-01'; school.academicYearEnd = '2027-07-03';
 school.periods = [{id: '1', label: 'S1', start: '2026-09-01', end: '2027-01-31'}, {id: '2', label: 'S2', start: '2027-02-01', end: '2027-07-03'}];
 expect(isSchoolStepValid(school)).toBe(true);
 school.periods[1]!.start = '2027-02-30'; expect(isSchoolStepValid(school)).toBe(false);
 school.periods[1]!.start = '2027-01-31'; expect(isSchoolStepValid(school)).toBe(false);
 school.periods[1]!.start = '2027-02-01'; school.periods[1]!.label = 'S1'; expect(isSchoolStepValid(school)).toBe(false);
 school.periods[1]!.label = 'S2'; school.periods[1]!.end = '2027-07-04'; expect(isSchoolStepValid(school)).toBe(false);
});
