import type { ImportPageState } from '../import-page.svelte';
import { listPageHasItems, resolvePageLoad } from '$lib/queries/page-status';
import { emptyImportSlice } from './import-helpers';

export function queryImportListPage(state: ImportPageState) {
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
