import type { PageQueryRequest } from '$lib/queries/page-status';
import type { PaymentPageState } from '../payment-page.svelte';
import { academicContext } from '$lib/academic/context.svelte';
import { loadPaymentPageData } from '$lib/api/finance-data';
import { getBrowserSchoolClient } from '$lib/api/school-client';
import { authSession } from '$lib/auth/session.svelte';
import { listPageHasItems, resolvePageLoad } from '$lib/queries/page-status';
import { emptyPaymentSlice } from './payment-helpers';

export async function loadPaymentSlice() {
	const schoolId = authSession.schoolId ?? academicContext.schools[0]?.id ?? '';
	const academicYearId = academicContext.yearId;
	if (!schoolId || !academicYearId) {
		return emptyPaymentSlice();
	}
	const client = getBrowserSchoolClient();
	return loadPaymentPageData(client, { schoolId, academicYearId });
}

export function queryPaymentListPage(state: PaymentPageState) {
	return (url: URL, request?: PageQueryRequest) => resolvePageLoad(url, {
		empty: () => emptyPaymentSlice(),
		load: async (signal) => {
			const data = await loadPaymentSlice();
			signal.throwIfAborted();
			state.applySlice(data);
			return data;
		},
		hasItems: listPageHasItems,
	}, request);
}
