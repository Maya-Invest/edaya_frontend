import type { GradeScale, ReportCardDefinition, ReportCardResult } from '$lib/types/report-cards';
import type { Student } from '$lib/types/school';
import { resolveScopedPeriodId } from '$lib/academic/period-scope';
import { listRouteCacheKeyWithPeriod } from '$lib/detail-route-patterns';
import { readClassReportCardListFilters } from '$lib/list/list-url-filters';

export interface ReportCardsPageSlice {
	classId: string;
	/** Academic period this slice was loaded for — used to re-seed on period changes. */
	periodId: string;
	students: Student[];
	results: ReportCardResult[];
	scales: GradeScale[];
	definitions: ReportCardDefinition[];
}

export function emptyReportCardsSlice(classId: string): ReportCardsPageSlice {
	return {
		classId,
		periodId: '',
		students: [],
		results: [],
		scales: [],
		definitions: [],
	};
}

export function reportCardDetailIdFromUrl(url: URL): string | undefined {
	const match = url.pathname.match(/\/classes\/([^/]+)\/report-cards\/([^/]+)/);
	return match?.[2];
}

export function reportCardsClassIdFromUrl(url: URL): string | undefined {
	const match = url.pathname.match(/\/classes\/([^/]+)\/report-cards/);
	return match?.[1];
}

export function reportCardsPeriodIdFromUrl(url: URL): string {
	return resolveScopedPeriodId(readClassReportCardListFilters(url).period);
}

/**
 * Cache by the raw `?period=` search param only.
 * Do not resolve via academicContext — that remounts the list when session period
 * changes before the URL updates, and hydrate snaps the select back.
 */
export function reportCardsListCacheKey(url: URL): string {
	return listRouteCacheKeyWithPeriod(url);
}
