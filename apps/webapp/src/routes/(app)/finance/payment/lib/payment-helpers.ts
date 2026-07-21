import type { Fee, Student, StudentBilling } from '$lib/types/school';

export interface PaymentPageSlice {
	fees: Fee[];
	billing: StudentBilling[];
	students: Student[];
}

export function emptyPaymentSlice(): PaymentPageSlice {
	return {
		fees: [],
		billing: [],
		students: [],
	};
}
