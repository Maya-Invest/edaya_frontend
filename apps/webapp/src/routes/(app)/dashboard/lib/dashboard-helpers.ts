import type { SchoolOverviewResponse } from '$lib/api/dashboard-data';

export interface DashboardPageSlice {
	overview: SchoolOverviewResponse | null;
}

export function emptyDashboardSlice(): DashboardPageSlice {
	return {
		overview: null,
	};
}
