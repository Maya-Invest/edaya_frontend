import type { PageQueryRequest } from '$lib/queries/page-status';
import type { ClassStudentsPageState } from '../class-students-page.svelte';
import { listPageHasItems, resolvePageLoad } from '$lib/queries/page-status';

export function queryClassStudentsListPage(state: ClassStudentsPageState) {
	return (url: URL, request?: PageQueryRequest) => resolvePageLoad(url, {
		empty: () => ({ totalStudents: 0 }),
		load: async (signal) => {
			await state.loadFirstPage(signal);
			signal.throwIfAborted();
			return { totalStudents: state.totalStudents };
		},
		hasItems: listPageHasItems,
	}, request);
}
