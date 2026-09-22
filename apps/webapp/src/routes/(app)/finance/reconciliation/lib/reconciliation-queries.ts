import type { PageQueryRequest } from '$lib/queries/page-status';
import type { ReconciliationPageState } from '../reconciliation-page.svelte';
import { academicContext } from '$lib/academic/context.svelte';
import { loadFinanceReconciliation } from '$lib/api/finance-data';
import { getBrowserSchoolClient } from '$lib/api/school-client';
import { authSession } from '$lib/auth/session.svelte';
import { resolvePageLoad } from '$lib/queries/page-status';
import { emptyReconciliationSlice } from './reconciliation-helpers';

export async function loadReconciliationSlice() {
	const schoolId = authSession.schoolId ?? academicContext.schools[0]?.id ?? '';
	if (!schoolId) {
		return emptyReconciliationSlice();
	}
	const client = getBrowserSchoolClient();
	const reconciliation = await loadFinanceReconciliation(client, {
		schoolId,
		academicYearId: academicContext.yearId || undefined,
	});
	return { reconciliation };
}

export function queryReconciliationPage(state: ReconciliationPageState) {
	return (url: URL, request?: PageQueryRequest) => resolvePageLoad(url, {
		empty: () => emptyReconciliationSlice(),
		load: async (signal) => {
			const data = await loadReconciliationSlice();
			signal.throwIfAborted();
			state.applySlice(data);
			return data;
		},
		hasItems: () => true,
	}, request);
}
