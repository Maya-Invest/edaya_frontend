import type { SchoolOverviewResponse } from '$lib/api/dashboard-data';
import { fetchSchoolOverview } from '$lib/api/dashboard-data';
import { hasPermission } from '$lib/permissions';
import { queryClient } from '$lib/queries/client';
import { resolvePageLoad } from '$lib/queries/page-status';

export interface DashboardPageData {
	overview: SchoolOverviewResponse | null;
}

export function queryDashboardPage() {
	return (url: URL) => resolvePageLoad(url, {
		empty: (): DashboardPageData => ({ overview: null }),
		load: async () => {
			if (!hasPermission('QUERY_OVERVIEW_READ')) {
				return { overview: null };
			}
			return { overview: await fetchSchoolOverview(queryClient()) };
		},
		hasItems: data => data.overview !== null,
	});
}
