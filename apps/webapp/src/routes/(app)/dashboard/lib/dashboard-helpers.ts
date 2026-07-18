import type { SchoolOverviewResponse } from '$lib/api/dashboard-data';
import type { HomeroomAttendanceClassContext } from '$lib/school/homeroom-attendance-nudge';

export interface DashboardPageSlice {
	overview: SchoolOverviewResponse | null;
	homeroomAttendanceByClass: Record<string, HomeroomAttendanceClassContext>;
}

export function emptyDashboardSlice(): DashboardPageSlice {
	return {
		overview: null,
		homeroomAttendanceByClass: {},
	};
}
