import type { StudentYearAccountView } from '$lib/api/finance-data';
import type { Fee, Student, StudentBilling } from '$lib/types/school';

export interface BillingPageSlice {
	total?: number;
	fees: Fee[];
	billing: StudentBilling[];
	students: Student[];
	accounts: StudentYearAccountView[];
}

export function emptyBillingSlice(): BillingPageSlice {
	return {
		fees: [],
		billing: [],
		students: [],
		accounts: [],
	};
}

export function billingDetailIdFromUrl(url: URL): string | undefined {
	const match = url.pathname.match(/\/finance\/billing\/([^/]+)/);
	return match?.[1];
}
