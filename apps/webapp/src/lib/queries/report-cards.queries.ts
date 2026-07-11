import type {
	GradeScale,
	ReportCardDefinition,
} from '$lib/types/report-cards';
import { ApiError } from '@edaya/api-client';
import { academicContext } from '$lib/academic/context.svelte';
import { loadClassPeopleData } from '$lib/api/people-data';
import {
	loadClassReportCardResultsData,
	loadReportCardCatalogData,
} from '$lib/api/report-cards-data';
import { safeOptionalEntityList } from '$lib/api/safe-entity-access';
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
				try {
					await refreshReportCardCatalog();
				}
				catch (error) {
					if (!(error instanceof ApiError && (error.status === 403 || error.status === 401))) {
						throw error;
					}
				}
			}
			const periodId = academicContext.periodId;
			const client = queryClient();
			const [results, people] = await Promise.all([
				safeOptionalEntityList(() =>
					loadClassReportCardResultsData(
						client,
						classId,
						periodId,
						reportCardsContext.definitions,
					)),
				loadClassPeopleData(client, classId, periodId).catch(() => ({ students: [] })),
			]);
			reportCardsContext.seedClassPeriodResults(results, { classId, periodId });
			detailDataContext.seedStudents(people.students, { classId });
			return { classId };
		},
		hasItems: listPageHasItems,
	});
}
