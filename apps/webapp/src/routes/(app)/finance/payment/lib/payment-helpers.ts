import type { FinancePayment, StudentYearAccountView } from '$lib/api/finance-data';
import type { Student } from '$lib/types/school';

export interface PaymentPageSlice {
	payments: FinancePayment[];
	students: Student[];
	accounts: StudentYearAccountView[];
}

export function emptyPaymentSlice(): PaymentPageSlice {
	return {
		payments: [],
		students: [],
		accounts: [],
	};
}
