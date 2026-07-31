import type { FinancePayment } from '$lib/api/finance-data';
import type { Fee, Student, StudentBilling } from '$lib/types/school';

export interface PaymentPageSlice {
	fees: Fee[];
	billing: StudentBilling[];
	students: Student[];
	payments: FinancePayment[];
}

export function emptyPaymentSlice(): PaymentPageSlice {
	return {
		fees: [],
		billing: [],
		students: [],
		payments: [],
	};
}
