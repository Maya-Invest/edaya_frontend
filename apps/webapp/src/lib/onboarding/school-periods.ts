import type { OnboardingPeriodDraft, OnboardingSchoolDraft } from '$lib/onboarding/types';

export function periodCount(type: OnboardingSchoolDraft['periodType']): number {
	return type === 'trimester' ? 3 : 2;
}

export function periodLabelForIndex(
	type: OnboardingSchoolDraft['periodType'],
	index: number,
): string {
	const number = index + 1;
	return type === 'trimester' ? `Trimestre ${number}` : `Semestre ${number}`;
}

function preferredPeriodDates(
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

/** Keep the usual school breaks when they fit; otherwise split the selected year. */
export function periodTemplateDates(
	type: OnboardingSchoolDraft['periodType'],
	index: number,
	yearStart: string,
	yearEnd: string,
): { start: string; end: string } {
	const count = periodCount(type);
	const preferred = Array.from({ length: count }, (_, i) => preferredPeriodDates(type, i, yearStart, yearEnd));
	if (preferred.every((period, i) => period.start >= yearStart && period.end <= yearEnd
		&& period.start <= period.end && (i === 0 || preferred[i - 1]!.end < period.start))) {
		return preferred[index]!;
	}
	const start = Date.parse(`${yearStart}T00:00:00.000Z`);
	const end = Date.parse(`${yearEnd}T00:00:00.000Z`);
	const days = Math.round((end - start) / 86400000) + 1;
	if (!Number.isFinite(days) || days < count)
		return { start: '', end: '' };
	const dateAt = (offset: number) => new Date(start + offset * 86400000).toISOString().slice(0, 10);
	return {
		start: dateAt(Math.floor(index * days / count)),
		end: dateAt(Math.floor((index + 1) * days / count) - 1),
	};
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
	return Array.from({ length: periodCount(type) }, (_, index) => createDefaultPeriod(type, index, yearStart, yearEnd));
}

/** Restore the type's fixed count while retaining editable values in existing slots. */
export function normalizePeriodCount(school: OnboardingSchoolDraft): OnboardingSchoolDraft {
	const count = periodCount(school.periodType);
	if (school.periods.length === count)
		return school;
	return {
		...school,
		periods: Array.from({ length: count }, (_, index) => school.periods[index]
			?? createDefaultPeriod(school.periodType, index, school.academicYearStart, school.academicYearEnd)),
	};
}

export function setPeriodType(
	school: OnboardingSchoolDraft,
	type: OnboardingSchoolDraft['periodType'],
): OnboardingSchoolDraft {
	if (school.periodType === type) {
		return normalizePeriodCount(school);
	}

	return {
		...school,
		periodType: type,
		periods: createInitialPeriods(type, school.academicYearStart, school.academicYearEnd),
	};
}
