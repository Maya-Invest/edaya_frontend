import type { Fee } from '$lib/types/school';

export interface FeesPageSlice {
	fees: Fee[];
}

export function emptyFeesSlice(): FeesPageSlice {
	return {
		fees: [],
	};
}
