import type { DashboardPageState } from '../dashboard-page.svelte';
import type { DashboardPageSlice } from './dashboard-helpers';
import { academicContext } from '$lib/academic/context.svelte';
import { fetchSchoolOverview } from '$lib/api/dashboard-data';
import { authSession } from '$lib/auth/session.svelte';
import { hasPermission } from '$lib/permissions';
import { queryClient } from '$lib/queries/client';
import { listPageHasItems, resolvePageLoad } from '$lib/queries/page-status';
import {
	homeroomDailyClassesForStaff,
} from '$lib/school/homeroom-attendance-nudge';
import { loadHomeroomAttendanceByClass } from '$lib/school/homeroom-attendance-nudge-data';
import { emptyDashboardSlice } from './dashboard-helpers';

export async function loadDashboardSlice(): Promise<DashboardPageSlice> {
	const overview = hasPermission('QUERY_OVERVIEW_READ')
		? await fetchSchoolOverview(queryClient())
		: null;

	const staffId = authSession.user?.id ?? authSession.userId ?? '';
	const homeroomClasses = academicContext.shellReady && staffId
		? homeroomDailyClassesForStaff(academicContext.classes, staffId)
		: [];

	const fallbackStudentCounts = Object.fromEntries(
		academicContext.classes.map(cls => [cls.id, cls.studentCount]),
	);

	const homeroomAttendanceByClass: DashboardPageSlice['homeroomAttendanceByClass'] = {};
	if (homeroomClasses.length > 0) {
		const loaded = await loadHomeroomAttendanceByClass(
			queryClient(),
			homeroomClasses.map(cls => cls.id),
			fallbackStudentCounts,
		);
		for (const [classId, context] of loaded.entries()) {
			homeroomAttendanceByClass[classId] = context;
		}
	}

	return {
		overview,
		homeroomAttendanceByClass,
	};
}

export function queryDashboardListPage(state: DashboardPageState) {
	return (url: URL) => resolvePageLoad(url, {
		empty: () => emptyDashboardSlice(),
		load: async () => {
			const data = await loadDashboardSlice();
			state.applySlice(data);
			return data;
		},
		hasItems: listPageHasItems,
	});
}
