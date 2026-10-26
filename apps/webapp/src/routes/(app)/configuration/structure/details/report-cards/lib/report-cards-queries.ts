import type { PageQueryRequest } from '$lib/queries/page-status';
import type { ReportCardsPageState } from '../report-cards-page.svelte';
import { academicContext } from '$lib/academic/context.svelte';
import { loadReportCardCatalogData } from '$lib/api/report-cards-data';
import { getBrowserSchoolClient } from '$lib/api/school-client';
import { authSession } from '$lib/auth/session.svelte';
import { listPageHasItems, resolvePageLoad } from '$lib/queries/page-status';
import { emptyReportCardsSlice } from './report-cards-helpers';

export async function loadReportCardsSlice() {
	const schoolId = authSession.schoolId ?? academicContext.schools[0]?.id ?? '';
	if (!schoolId) {
		return emptyReportCardsSlice();
	}
	const data = await loadReportCardCatalogData(getBrowserSchoolClient(), schoolId);
	return {
		scales: data.gradeScales,
		definitions: data.definitions,
		subjects: data.subjects,
	};
}

export function queryReportCardsListPage(state: ReportCardsPageState) {
	return (url: URL, request?: PageQueryRequest) => resolvePageLoad(url, {
		empty: () => emptyReportCardsSlice(),
		load: async (signal) => {
			const data = await loadReportCardsSlice();
			signal.throwIfAborted();
			state.applySlice(data);
			return data;
		},
		hasItems: listPageHasItems,
		errorMessage: 'Unable to load report card models.',
	}, request);
}
