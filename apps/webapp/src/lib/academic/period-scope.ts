import { academicContext } from '$lib/academic/context.svelte';

/** Periods available for the selected academic year (published preferred). */
export function periodsForSelectedYear() {
	return academicContext.publishedPeriodsForYear.length > 0
		? academicContext.publishedPeriodsForYear
		: academicContext.periodsForYear;
}

/**
 * Resolve a period id for period-scoped routes.
 * Prefer explicit URL value, then the persisted shell selection, then the last period of the year.
 */
export function resolveScopedPeriodId(periodFromUrl = ''): string {
	const periods = periodsForSelectedYear();
	if (periodFromUrl && periods.some(period => period.id === periodFromUrl)) {
		return periodFromUrl;
	}
	if (academicContext.periodId && periods.some(period => period.id === academicContext.periodId)) {
		return academicContext.periodId;
	}
	return periods.at(-1)?.id ?? '';
}

/** Persist a page-level period choice into app/session state. */
export function persistScopedPeriodId(periodId: string) {
	if (!periodId || periodId === academicContext.periodId) {
		return;
	}
	const periods = periodsForSelectedYear();
	if (!periods.some(period => period.id === periodId)) {
		return;
	}
	academicContext.setPeriod(periodId);
}
