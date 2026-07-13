import type { Student } from '$lib/types/school';
import type { GradeScale, ReportCardDefinition, ReportCardResult } from '$lib/types/report-cards';

export interface ReportCardsPageSlice {
	classId: string;
	students: Student[];
	results: ReportCardResult[];
	scales: GradeScale[];
	definitions: ReportCardDefinition[];
}

export function emptyReportCardsSlice(classId: string): ReportCardsPageSlice {
	return {
		classId,
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
