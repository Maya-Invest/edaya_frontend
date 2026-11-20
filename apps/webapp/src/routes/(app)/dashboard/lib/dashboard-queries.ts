import type { PageQueryRequest } from '$lib/queries/page-status';
import type { DashboardPageState } from '../dashboard-page.svelte';
import { fetchSchoolOverview } from '$lib/api/dashboard-data';
import { queryClient } from '$lib/queries/client';
import { resolvePageLoad } from '$lib/queries/page-status';
import { emptyDashboardSlice } from './dashboard-helpers';

export async function loadDashboardSlice(signal?: AbortSignal) {
	const overview = await fetchSchoolOverview(queryClient(), signal);

	return { overview };
}

export function queryDashboardListPage(state: DashboardPageState) {
	return (url: URL, request?: PageQueryRequest) => resolvePageLoad(url, {
		empty: () => emptyDashboardSlice(),
		load: async (signal) => {
			state.clear();
			const data = await loadDashboardSlice(signal);
			signal.throwIfAborted();
			state.applySlice(data);
			return data;
		},
		hasItems: data => data.overview !== null,
	}, request);
}
