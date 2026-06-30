import type {
	GradeScale,
	ReportCardDefinition,
} from '$lib/types/report-cards';
import { academicContext } from '$lib/academic/context.svelte';
import { loadClassPeopleData } from '$lib/api/people-data';
import {
	loadClassReportCardResultsData,
	loadReportCardCatalogData,
} from '$lib/api/report-cards-data';
import { getBrowserSchoolClient } from '$lib/api/school-client';
import { detailDataContext } from '$lib/detail-data/context.svelte';
import { queryClient } from '$lib/queries/client';
import { listPageHasItems, resolvePageLoad } from '$lib/queries/page-status';
import { reportCardsContext } from '$lib/report-cards/context.svelte';

export async function refreshReportCardCatalog(): Promise<void> {
	const data = await getReportCardCatalogData();
	reportCardsContext.hydrateCatalog(data);
}

export async function getReportCardCatalogData(): Promise<{
	gradeScales: GradeScale[];
	reportCardDefinitions: ReportCardDefinition[];
}> {
	const live = await loadReportCardCatalogData(getBrowserSchoolClient());

	return {
		gradeScales: live.gradeScales,
		reportCardDefinitions: live.definitions,
	};
}

export function queryClassReportCardsPage(classId: string) {
	return (url: URL) => resolvePageLoad(url, {
		empty: () => ({ classId }),
		load: async () => {
			if (!reportCardsContext.ready) {
				await refreshReportCardCatalog();
			}
			const periodId = academicContext.periodId;
			const client = queryClient();
			const [results, { students }] = await Promise.all([
				loadClassReportCardResultsData(
					client,
					classId,
					periodId,
					reportCardsContext.definitions,
				),
				loadClassPeopleData(client, classId, periodId),
			]);
			reportCardsContext.seedClassPeriodResults(results, { classId, periodId });
			detailDataContext.seedStudents(students, { classId });
			return { classId };
		},
		hasItems: listPageHasItems,
	});
}
