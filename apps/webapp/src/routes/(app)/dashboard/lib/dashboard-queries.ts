import type { PageQueryRequest } from '$lib/queries/page-status';
import type { DashboardPageState } from '../dashboard-page.svelte';
import { fetchSchoolOverview } from '$lib/api/dashboard-data';
import { hasPermission } from '$lib/permissions';
import { queryClient } from '$lib/queries/client';
import { listPageHasItems, resolvePageLoad } from '$lib/queries/page-status';
import { emptyDashboardSlice } from './dashboard-helpers';

export async function loadDashboardSlice() {
	const overview = hasPermission('WORKSPACE_ACCESS')
		? await fetchSchoolOverview(queryClient())
		: null;

	return { overview };
}

export function queryDashboardListPage(state: DashboardPageState) {
	return (url: URL, request?: PageQueryRequest) => resolvePageLoad(url, {
		empty: () => emptyDashboardSlice(),
		load: async (signal) => {
			const data = await loadDashboardSlice();
			signal.throwIfAborted();
			state.applySlice(data);
			return data;
		},
		hasItems: listPageHasItems,
	}, request);
}
