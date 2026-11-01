import type { AcademicPeriod } from '$lib/types/school';

/** Published terms take precedence; draft/archived terms remain the legacy fallback. */
export function selectableAcademicPeriods(periods: readonly AcademicPeriod[], yearId: string): AcademicPeriod[] {
	const forYear = periods.filter(period => period.academicYearId === yearId);
	const published = forYear.filter(period => period.status === 'published');
	return published.length > 0 ? published : forYear;
}

export function resolveAcademicPeriodId(periods: readonly AcademicPeriod[], yearId: string, selectedId: string): string {
	const options = selectableAcademicPeriods(periods, yearId);
	return options.find(period => period.id === selectedId)?.id ?? options.at(-1)?.id ?? '';
}
