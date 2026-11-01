import type { PageQueryRequest } from '$lib/queries/page-status';
import type { ReportCardsPageState } from '../report-cards-page.svelte';
import { academicContext } from '$lib/academic/context.svelte';
import { loadClassPeopleData } from '$lib/api/people-data';
import {
	loadClassReportCardResultsData,
} from '$lib/api/report-cards-data';
import { safeOptionalEntityList } from '$lib/api/safe-entity-access';
import { getBrowserSchoolClient } from '$lib/api/school-client';
import { listPageHasItems, resolvePageLoad } from '$lib/queries/page-status';
import { emptyReportCardsSlice } from './report-cards-helpers';

export async function loadReportCardsSlice(classId: string) {
	const periodId = academicContext.periodId;
	const client = getBrowserSchoolClient();

	const [results, people] = await Promise.all([
		periodId
			? safeOptionalEntityList(() =>
					loadClassReportCardResultsData(client, classId, periodId),
				)
			: Promise.resolve([]),
		periodId
			? loadClassPeopleData(client, classId, periodId).catch(() => ({ students: [] }))
			: Promise.resolve({ students: [] }),
	]);

	return {
		...emptyReportCardsSlice(classId),
		students: people.students,
		results,
		scales: [],
	};
}

export function queryReportCardsListPage(classId: string, state: ReportCardsPageState) {
	return (url: URL, request?: PageQueryRequest) => resolvePageLoad(url, {
		empty: () => emptyReportCardsSlice(classId),
		load: async (signal) => {
			const data = await loadReportCardsSlice(classId);
			signal.throwIfAborted();
			state.applySlice(classId, data);
			return data;
		},
		hasItems: listPageHasItems,
	}, request);
}
