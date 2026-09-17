import type { BillingPageState } from '../billing-page.svelte';
import { academicContext } from '$lib/academic/context.svelte';
import { loadBillingPageData } from '$lib/api/finance-data';
import { getBrowserSchoolClient } from '$lib/api/school-client';
import { authSession } from '$lib/auth/session.svelte';
import { listPageHasItems, resolvePageLoad } from '$lib/queries/page-status';
import { emptyBillingSlice } from './billing-helpers';

export async function loadBillingSlice() {
	const schoolId = authSession.schoolId ?? academicContext.schools[0]?.id ?? '';
	const academicYearId = academicContext.yearId;
	if (!schoolId || !academicYearId) {
		return emptyBillingSlice();
	}
	const client = getBrowserSchoolClient();
	return loadBillingPageData(client, { schoolId, academicYearId });
}

export function queryBillingListPage(state: BillingPageState) {
	return (url: URL) => resolvePageLoad(url, {
		empty: () => emptyBillingSlice(),
		load: async () => {
			const data = await loadBillingSlice();
			state.applySlice(data);
			return data;
		},
		hasItems: listPageHasItems,
	});
}
