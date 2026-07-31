import type { Fee, StudentBilling } from '$lib/types/school';

export interface FeesPageSlice {
	fees: Fee[];
	billing: StudentBilling[];
}

export function emptyFeesSlice(): FeesPageSlice {
	return {
		fees: [],
		billing: [],
	};
}
