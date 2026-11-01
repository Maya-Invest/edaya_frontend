import type { PageQueryRequest } from '$lib/queries/page-status';
import type { BillingPageState } from '../billing-page.svelte';
import { academicContext } from '$lib/academic/context.svelte';
import { listCatalogServices } from '$lib/api/finance-data';
import { readBillingPage, billingFilters } from '$lib/api/finance-workspace';
import { getBrowserSchoolClient } from '$lib/api/school-client';
import { authSession } from '$lib/auth/session.svelte';
import { listPageHasItems, resolvePageLoad } from '$lib/queries/page-status';
import { emptyBillingSlice } from './billing-helpers';

export async function loadBillingSlice(url?: URL) {
	const schoolId = authSession.schoolId ?? academicContext.schools[0]?.id ?? '';
	const academicYearId = academicContext.yearId;
	if (!schoolId || !academicYearId) {
		return emptyBillingSlice();
	}
	const client = getBrowserSchoolClient();
	const [fees, result] = await Promise.all([listCatalogServices(client, { schoolId, academicYearId }), readBillingPage(url ? billingFilters(url) : {})]);
	return { fees, billing: result.rows, total: result.total, students: [], accounts: result.rows.filter(row => row.accountId).map(row => ({ id: row.accountId!, studentId: row.studentId, academicYearId: row.academicYearId, currency: row.currency, availableBalance: row.availableCredit ?? 0 })) };
}

export function queryBillingListPage(state: BillingPageState) {
	return (url: URL, request?: PageQueryRequest) => resolvePageLoad(url, {
		empty: () => emptyBillingSlice(),
		load: async (signal) => {
			const data = await loadBillingSlice(url);
			signal.throwIfAborted();
			state.applySlice(data);
			return data;
		},
		hasItems: listPageHasItems,
	}, request);
}
