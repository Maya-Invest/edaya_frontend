import type { ToolsPageState } from '../tools-page.svelte';
import { listPageHasItems, resolvePageLoad } from '$lib/queries/page-status';
import { emptyImportSlice } from './import-helpers';

export function queryToolsListPage(state: ToolsPageState) {
	return (url: URL) => resolvePageLoad(url, {
		empty: () => emptyImportSlice(),
		load: async () => {
			const data = emptyImportSlice();
			state.applySlice(data);
			return data;
		},
		hasItems: listPageHasItems,
	});
}
