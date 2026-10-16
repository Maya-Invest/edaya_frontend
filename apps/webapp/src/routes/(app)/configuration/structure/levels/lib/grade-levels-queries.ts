import type { PageQueryRequest } from '$lib/queries/page-status';
import type { GradeLevelsPageState } from '../grade-levels-page.svelte';
import type { GradeLevelsPageSlice } from './grade-levels-helpers';
import { academicContext } from '$lib/academic/context.svelte';
import { listPageHasItems, resolvePageLoad } from '$lib/queries/page-status';
import { emptyGradeLevelsSlice } from './grade-levels-helpers';

export async function loadGradeLevelsSlice(): Promise<GradeLevelsPageSlice> {
	return {
		levelCount: academicContext.gradeLevels.length,
	};
}

export function queryGradeLevelsListPage(state: GradeLevelsPageState) {
	return (url: URL, request?: PageQueryRequest) => resolvePageLoad(url, {
		empty: () => emptyGradeLevelsSlice(),
		load: async (signal) => {
			const data = await loadGradeLevelsSlice();
			signal.throwIfAborted();
			state.applySlice(data);
			return data;
		},
		hasItems: listPageHasItems,
	}, request);
}
