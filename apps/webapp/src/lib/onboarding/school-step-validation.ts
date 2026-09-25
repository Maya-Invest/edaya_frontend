import type { OnboardingPeriodDraft, OnboardingSchoolDraft } from '$lib/onboarding/types';

export interface SchoolStepValidationResult {
	valid: boolean;
	missingFields: Array<keyof OnboardingSchoolDraft | 'periods'>;
}
function hasText(value: string): boolean {
	return value.trim().length > 0;
}
function isValidDate(value: string): boolean {
	return /^\d{4}-\d{2}-\d{2}$/.test(value);
}
function isValidDateRange(start: string, end: string): boolean {
	return isValidDate(start) && isValidDate(end) && start <= end;
}
function periodFitsInYearBounds(
	period: OnboardingPeriodDraft,
	yearStart: string,
	yearEnd: string,
): boolean {
	if (!isValidDateRange(period.start, period.end)) {
		return false;
	}
	return period.start >= yearStart && period.end <= yearEnd;
}
export function periodFitsInAcademicYear(draft: OnboardingSchoolDraft): boolean {
	if (!isValidDateRange(draft.academicYearStart, draft.academicYearEnd)) {
		return false;
	}
	if (draft.periods.length === 0) {
		return false;
	}
	return draft.periods.every(period =>
		periodFitsInYearBounds(period, draft.academicYearStart, draft.academicYearEnd),
	);
}
export function validateSchoolStep(draft: OnboardingSchoolDraft): SchoolStepValidationResult {
	const missingFields: Array<keyof OnboardingSchoolDraft | 'periods'> = [];
	if (!/^[A-Z]{3}$/.test(draft.financeCurrency?.trim().toUpperCase() ?? '')) {
		missingFields.push('financeCurrency');
	}
	if (!hasText(draft.name)) {
		missingFields.push('name');
	}
	if (!hasText(draft.city)) {
		missingFields.push('city');
	}
	if (!hasText(draft.country)) {
		missingFields.push('country');
	}
	if (!hasText(draft.timezone)) {
		missingFields.push('timezone');
	}
	if (!isValidDateRange(draft.academicYearStart, draft.academicYearEnd)) {
		missingFields.push('academicYearStart', 'academicYearEnd');
	}
	if (draft.periods.length === 0) {
		missingFields.push('periods');
	}
	for (const period of draft.periods) {
		if (!hasText(period.label)) {
			missingFields.push('periods');
		}
		if (!isValidDateRange(period.start, period.end)) {
			missingFields.push('periods');
		}
	}
	if (!periodFitsInAcademicYear(draft)) {
		missingFields.push('periods', 'academicYearStart', 'academicYearEnd');
	}
	return {
		valid: missingFields.length === 0,
		missingFields,
	};
}
export function isSchoolStepValid(draft: OnboardingSchoolDraft): boolean {
	return validateSchoolStep(draft).valid;
}
