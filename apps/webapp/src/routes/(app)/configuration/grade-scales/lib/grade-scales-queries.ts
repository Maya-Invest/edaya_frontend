import type { GradeScalesPageState } from '../grade-scales-page.svelte';
import { loadReportCardCatalogData } from '$lib/api/report-cards-data';
import { getBrowserSchoolClient } from '$lib/api/school-client';
import { listPageHasItems, resolvePageLoad } from '$lib/queries/page-status';
import { ApiError } from '@maya-invest/edaya-api-client';
import { emptyGradeScalesSlice } from './grade-scales-helpers';

export async function loadGradeScalesSlice() {
	try {
		const data = await loadReportCardCatalogData(getBrowserSchoolClient());
		return { scales: data.gradeScales };
	}
	catch (error) {
		if (error instanceof ApiError && (error.status === 403 || error.status === 401)) {
			return emptyGradeScalesSlice();
		}
		throw error;
	}
}

export function queryGradeScalesListPage(state: GradeScalesPageState) {
	return (url: URL) => resolvePageLoad(url, {
		empty: () => emptyGradeScalesSlice(),
		load: async () => {
			const data = await loadGradeScalesSlice();
			state.applySlice(data);
			return data;
		},
		hasItems: listPageHasItems,
		errorMessage: 'Unable to load grade scales.',
	});
}
