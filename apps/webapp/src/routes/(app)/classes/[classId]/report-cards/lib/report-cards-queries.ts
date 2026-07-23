import type { ReportCardsPageState } from '../report-cards-page.svelte';
import { loadClassPeopleData } from '$lib/api/people-data';
import {
	loadClassReportCardResultsData,
	loadReportCardCatalogData,
} from '$lib/api/report-cards-data';
import { safeOptionalEntityList } from '$lib/api/safe-entity-access';
import { getBrowserSchoolClient } from '$lib/api/school-client';
import { listPageHasItems, resolvePageLoad } from '$lib/queries/page-status';
import { ApiError } from '@maya-invest/edaya-api-client';
import { emptyReportCardsSlice, reportCardsPeriodIdFromUrl } from './report-cards-helpers';

export async function loadReportCardsSlice(classId: string, periodId: string) {
	const client = getBrowserSchoolClient();
	let catalog;
	try {
		catalog = await loadReportCardCatalogData(client);
	}
	catch (error) {
		if (!(error instanceof ApiError && (error.status === 403 || error.status === 401))) {
			throw error;
		}
		catalog = { gradeScales: [], definitions: [] };
	}

	const [results, people] = await Promise.all([
		periodId
			? safeOptionalEntityList(() =>
					loadClassReportCardResultsData(client, classId, periodId, catalog.definitions),
				)
			: Promise.resolve([]),
		periodId
			? loadClassPeopleData(client, classId, periodId).catch(() => ({ students: [] }))
			: Promise.resolve({ students: [] }),
	]);

	return {
		...emptyReportCardsSlice(classId),
		periodId,
		students: people.students,
		results,
		scales: catalog.gradeScales,
		definitions: catalog.definitions,
	};
}

export function queryReportCardsListPage(classId: string, state: ReportCardsPageState) {
	return (url: URL) => resolvePageLoad(url, {
		empty: () => emptyReportCardsSlice(classId),
		load: async () => {
			const periodId = reportCardsPeriodIdFromUrl(url);
			const data = await loadReportCardsSlice(classId, periodId);
			state.applySlice(classId, data);
			return data;
		},
		hasItems: listPageHasItems,
	});
}
