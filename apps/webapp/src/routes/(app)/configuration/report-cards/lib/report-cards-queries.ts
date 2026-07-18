import type { ReportCardsPageState } from '../report-cards-page.svelte';
import { loadReportCardCatalogData } from '$lib/api/report-cards-data';
import { getBrowserSchoolClient } from '$lib/api/school-client';
import { listPageHasItems, resolvePageLoad } from '$lib/queries/page-status';
import { ApiError } from '@maya-invest/edaya-api-client';
import { emptyReportCardsSlice } from './report-cards-helpers';

export async function loadReportCardsSlice() {
	try {
		const data = await loadReportCardCatalogData(getBrowserSchoolClient());
		return {
			scales: data.gradeScales,
			definitions: data.definitions,
		};
	}
	catch (error) {
		if (error instanceof ApiError && (error.status === 403 || error.status === 401)) {
			return emptyReportCardsSlice();
		}
		throw error;
	}
}

export function queryReportCardsListPage(state: ReportCardsPageState) {
	return (url: URL) => resolvePageLoad(url, {
		empty: () => emptyReportCardsSlice(),
		load: async () => {
			const data = await loadReportCardsSlice();
			state.applySlice(data);
			return data;
		},
		hasItems: listPageHasItems,
		errorMessage: 'Unable to load report card models.',
	});
}
