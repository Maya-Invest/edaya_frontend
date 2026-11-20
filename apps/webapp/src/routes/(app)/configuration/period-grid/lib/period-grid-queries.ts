import type { PageQueryRequest } from '$lib/queries/page-status';
import type { PeriodGridPageState } from '../period-grid-page.svelte';
import { academicContext } from '$lib/academic/context.svelte';
import { bootstrapAppShell } from '$lib/auth/bootstrap-app';
import { listPageHasItems, resolvePageLoad } from '$lib/queries/page-status';
import { emptyPeriodGridSlice } from './period-grid-helpers';

export async function loadPeriodGridSlice() {
	await bootstrapAppShell();
	return { yearCount: academicContext.years.length };
}

export function queryPeriodGridPage(state: PeriodGridPageState) {
	return (url: URL, request?: PageQueryRequest) => resolvePageLoad(url, {
		empty: () => emptyPeriodGridSlice(),
		load: async (signal) => {
			const data = await loadPeriodGridSlice();
			signal.throwIfAborted();
			state.applySlice(data);
			return data;
		},
		hasItems: listPageHasItems,
	}, request);
}
