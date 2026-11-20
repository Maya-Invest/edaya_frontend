import type { PageQueryRequest } from '$lib/queries/page-status';
import type { PaymentPageState } from '../payment-page.svelte';
import { academicContext } from '$lib/academic/context.svelte';
import { readPaymentsPage, billingFilters } from '$lib/api/finance-workspace';

import { authSession } from '$lib/auth/session.svelte';
import { listPageHasItems, resolvePageLoad } from '$lib/queries/page-status';
import { emptyPaymentSlice } from './payment-helpers';

export async function loadPaymentSlice(url?: URL) {
	const schoolId = authSession.schoolId ?? academicContext.schools[0]?.id ?? '';
	const academicYearId = academicContext.yearId;
	if (!schoolId || !academicYearId) {
		return emptyPaymentSlice();
	}
	const result = await readPaymentsPage(url ? billingFilters(url) : {});
	return { payments: result.rows, total: result.total, students: [], accounts: [] };
}

export function queryPaymentListPage(state: PaymentPageState) {
	return (url: URL, request?: PageQueryRequest) => resolvePageLoad(url, {
		empty: () => emptyPaymentSlice(),
		load: async (signal) => {
			const data = await loadPaymentSlice(url);
			signal.throwIfAborted();
			state.applySlice(data);
			return data;
		},
		hasItems: listPageHasItems,
	}, request);
}
