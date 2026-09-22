import type { GradeScalesPageState } from '../grade-scales-page.svelte';
import { academicContext } from '$lib/academic/context.svelte';
import { loadGradeScalesCatalogData } from '$lib/api/report-cards-data';
import { getBrowserSchoolClient } from '$lib/api/school-client';
import { authSession } from '$lib/auth/session.svelte';
import { listPageHasItems, resolvePageLoad } from '$lib/queries/page-status';
import { ApiError } from '@maya-invest/edaya-api-client';
import { emptyGradeScalesSlice } from './grade-scales-helpers';

function catalogSchoolId() {
	return authSession.schoolId ?? academicContext.schools[0]?.id ?? '';
}

export async function loadGradeScalesSlice() {
	const schoolId = catalogSchoolId();
	if (!schoolId) {
		return emptyGradeScalesSlice();
	}
	try {
		const scales = await loadGradeScalesCatalogData(getBrowserSchoolClient(), schoolId);
		return { scales };
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
