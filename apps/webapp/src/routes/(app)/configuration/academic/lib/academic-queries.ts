import type { PageQueryRequest } from '$lib/queries/page-status';
import type { AcademicPageState } from '../academic-page.svelte';
import { academicContext } from '$lib/academic/context.svelte';
import { bootstrapAppShell } from '$lib/auth/bootstrap-app';
import { listPageHasItems, resolvePageLoad } from '$lib/queries/page-status';
import { emptyAcademicSlice } from './academic-helpers';

export async function loadAcademicSlice() {
	await bootstrapAppShell();
	return { yearCount: academicContext.years.length };
}

export function queryAcademicListPage(state: AcademicPageState) {
	return (url: URL, request?: PageQueryRequest) => resolvePageLoad(url, {
		empty: () => emptyAcademicSlice(),
		load: async (signal) => {
			const data = await loadAcademicSlice();
			signal.throwIfAborted();
			state.applySlice(data);
			return data;
		},
		hasItems: listPageHasItems,
	}, request);
}
