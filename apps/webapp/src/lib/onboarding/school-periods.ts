import type { OnboardingPeriodDraft, OnboardingSchoolDraft } from '$lib/onboarding/types';

export function maxPeriodCount(type: OnboardingSchoolDraft['periodType']): number {
	return type === 'trimester' ? 3 : 2;
}

export function periodLabelForIndex(
	type: OnboardingSchoolDraft['periodType'],
	index: number,
): string {
	const number = index + 1;
	return type === 'trimester' ? `Trimestre ${number}` : `Semestre ${number}`;
}

export function periodTemplateDates(
	type: OnboardingSchoolDraft['periodType'],
	index: number,
	yearStart: string,
	yearEnd: string,
): { start: string; end: string } {
	const startYear = Number.parseInt(yearStart.slice(0, 4), 10);
	const endYear = Number.parseInt(yearEnd.slice(0, 4), 10);

	if (type === 'trimester') {
		if (index === 0) {
			return { start: yearStart, end: `${startYear}-12-19` };
		}
		if (index === 1) {
			return { start: `${endYear}-01-05`, end: `${endYear}-04-03` };
		}
		return { start: `${endYear}-04-20`, end: yearEnd };
	}

	if (index === 0) {
		return { start: yearStart, end: `${startYear}-12-19` };
	}
	return { start: `${endYear}-01-05`, end: yearEnd };
}

export function createDefaultPeriod(
	type: OnboardingSchoolDraft['periodType'],
	index: number,
	yearStart: string,
	yearEnd: string,
): OnboardingPeriodDraft {
	const dates = periodTemplateDates(type, index, yearStart, yearEnd);
	return {
		id: crypto.randomUUID(),
		label: periodLabelForIndex(type, index),
		start: dates.start,
		end: dates.end,
	};
}

export function createInitialPeriods(
	type: OnboardingSchoolDraft['periodType'],
	yearStart: string,
	yearEnd: string,
): OnboardingPeriodDraft[] {
	return [createDefaultPeriod(type, 0, yearStart, yearEnd)];
}

export function canAddPeriod(school: OnboardingSchoolDraft): boolean {
	return school.periods.length < maxPeriodCount(school.periodType);
}

export function addPeriod(school: OnboardingSchoolDraft): OnboardingSchoolDraft {
	if (!canAddPeriod(school)) {
		return school;
	}

	const index = school.periods.length;
	return {
		...school,
		periods: [
			...school.periods,
			createDefaultPeriod(
				school.periodType,
				index,
				school.academicYearStart,
				school.academicYearEnd,
			),
		],
	};
}

export function removePeriod(school: OnboardingSchoolDraft, periodId: string): OnboardingSchoolDraft {
	if (school.periods.length <= 1) {
		return school;
	}

	return {
		...school,
		periods: school.periods.filter(period => period.id !== periodId),
	};
}

export function setPeriodType(
	school: OnboardingSchoolDraft,
	type: OnboardingSchoolDraft['periodType'],
): OnboardingSchoolDraft {
	if (school.periodType === type) {
		return school;
	}

	return {
		...school,
		periodType: type,
		periods: createInitialPeriods(type, school.academicYearStart, school.academicYearEnd),
	};
}
