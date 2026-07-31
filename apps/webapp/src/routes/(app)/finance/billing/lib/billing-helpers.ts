import type { Fee, Student, StudentBilling } from '$lib/types/school';

export interface BillingPageSlice {
	fees: Fee[];
	billing: StudentBilling[];
	students: Student[];
}

export function emptyBillingSlice(): BillingPageSlice {
	return {
		fees: [],
		billing: [],
		students: [],
	};
}

export function billingDetailIdFromUrl(url: URL): string | undefined {
	const match = url.pathname.match(/\/finance\/billing\/([^/]+)/);
	return match?.[1];
}
