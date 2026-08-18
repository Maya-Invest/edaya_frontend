export const ACADEMIC_YEAR_QUERY_KEY = 'year';
const COLLAPSED_VALUE = 'none';

export function readExpandedAcademicYear(
	url: URL,
	allowedYearIds: readonly string[],
	fallbackYearId: string | null,
): string | null {
	const value = url.searchParams.get(ACADEMIC_YEAR_QUERY_KEY);
	if (value === COLLAPSED_VALUE) {
		return null;
	}
	if (value && allowedYearIds.includes(value)) {
		return value;
	}
	return fallbackYearId && allowedYearIds.includes(fallbackYearId)
		? fallbackYearId
		: null;
}

export function writeExpandedAcademicYear(url: URL, yearId: string | null): string {
	const next = new URL(url);
	next.searchParams.set(ACADEMIC_YEAR_QUERY_KEY, yearId ?? COLLAPSED_VALUE);
	return `${next.pathname}${next.search}`;
}
