import type { PageQueryRequest } from '$lib/queries/page-status';
import type { ToolsPageState } from '../tools-page.svelte';
import { listPageHasItems, resolvePageLoad } from '$lib/queries/page-status';
import { emptyImportSlice } from './import-helpers';

export function queryToolsListPage(state: ToolsPageState) {
	return (url: URL, request?: PageQueryRequest) => resolvePageLoad(url, {
		empty: () => emptyImportSlice(),
		load: async (signal) => {
			const data = emptyImportSlice();
			signal.throwIfAborted();
			state.applySlice(data);
			return data;
		},
		hasItems: listPageHasItems,
	}, request);
}
