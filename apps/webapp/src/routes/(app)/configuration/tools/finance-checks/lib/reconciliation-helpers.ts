import type { FinanceReconciliation } from '$lib/api/finance-types';

export interface ReconciliationPageSlice {
	reconciliation: FinanceReconciliation | null;
}

export function emptyReconciliationSlice(): ReconciliationPageSlice {
	return {
		reconciliation: null,
	};
}
