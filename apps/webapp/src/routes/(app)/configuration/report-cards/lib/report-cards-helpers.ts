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
	const match = url.pathname.match(/\/configuration\/report-cards\/([^/]+)/);
	return match?.[1];
}
