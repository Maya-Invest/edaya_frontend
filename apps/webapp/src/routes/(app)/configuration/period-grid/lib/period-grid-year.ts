export const PERIOD_GRID_YEAR_QUERY_KEY = 'year';

export function readPeriodGridYear(
	url: URL,
	allowedYearIds: readonly string[],
	fallbackYearId: string | null,
): string | null {
	const value = url.searchParams.get(PERIOD_GRID_YEAR_QUERY_KEY);
	if (value && allowedYearIds.includes(value)) {
		return value;
	}
	return fallbackYearId && allowedYearIds.includes(fallbackYearId)
		? fallbackYearId
		: allowedYearIds[0] ?? null;
}

export function writePeriodGridYear(url: URL, yearId: string | null): string {
	const next = new URL(url);
	if (yearId) {
		next.searchParams.set(PERIOD_GRID_YEAR_QUERY_KEY, yearId);
	}
	else {
		next.searchParams.delete(PERIOD_GRID_YEAR_QUERY_KEY);
	}
	return `${next.pathname}${next.search}`;
}
