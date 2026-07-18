import type { FeesPageState } from '../fees-page.svelte';
import { academicContext } from '$lib/academic/context.svelte';
import { loadFinanceData } from '$lib/api/finance-data';
import { getBrowserSchoolClient } from '$lib/api/school-client';
import { authSession } from '$lib/auth/session.svelte';
import { listPageHasItems, resolvePageLoad } from '$lib/queries/page-status';
import { emptyFeesSlice } from './fees-helpers';

export async function loadFeesSlice() {
	const schoolId = authSession.schoolId ?? academicContext.schools[0]?.id ?? '';
	const academicYearId = academicContext.yearId;
	if (!schoolId || !academicYearId) {
		return emptyFeesSlice();
	}
	const client = getBrowserSchoolClient();
	const data = await loadFinanceData(client, { schoolId, academicYearId });
	return {
		fees: data.fees,
		billing: data.billing,
	};
}

export function queryFeesListPage(state: FeesPageState) {
	return (url: URL) => resolvePageLoad(url, {
		empty: () => emptyFeesSlice(),
		load: async () => {
			const data = await loadFeesSlice();
			state.applySlice(data);
			return data;
		},
		hasItems: listPageHasItems,
	});
}
