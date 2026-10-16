import type { GradeScale, ReportCardDefinition } from '$lib/types/report-cards';

export interface ReportCardsPageSlice {
	subjects?: { id: string; name: string }[];
	scales: GradeScale[];
	definitions: ReportCardDefinition[];
}

export function emptyReportCardsSlice(): ReportCardsPageSlice {
	return {
		scales: [],
		definitions: [],
	};
}

export function reportCardDefinitionIdFromUrl(url: URL): string | undefined {
	const match = url.pathname.match(/\/configuration\/structure\/details\/report-cards\/([^/]+)/);
	return match?.[1];
}

/** Report templates belong to exactly one level and academic year. */
export function reportCardsForScope(definitions: readonly ReportCardDefinition[], gradeLevelId: string, academicYearId: string): ReportCardDefinition[] {
	return definitions.filter(definition => definition.gradeLevelId === gradeLevelId && definition.academicYearId === academicYearId);
}

/** Compatibility entry points retain modal and filter context. */
export function legacyReportCardsHref(url: URL): string {
	const id = url.pathname.match(/^\/configuration\/report-cards\/([^/]+)\/?$/)?.[1];
	return `/configuration/structure/details${id ? `/report-cards/${id}` : ''}${url.search}`;
}
