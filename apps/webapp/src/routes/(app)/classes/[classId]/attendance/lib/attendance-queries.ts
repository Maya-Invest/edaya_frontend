import type { AttendancePageState } from '../attendance-page.svelte';
import { loadClassAttendancePageData } from '$lib/api/attendance-data';
import { getBrowserSchoolClient } from '$lib/api/school-client';
import { listPageHasItems, resolvePageLoad } from '$lib/queries/page-status';
import { emptyAttendanceSlice } from './attendance-helpers';

export async function loadAttendanceSlice(classId: string) {
	const client = getBrowserSchoolClient();
	const { attendanceDays } = await loadClassAttendancePageData(client, classId);
	return {
		...emptyAttendanceSlice(classId),
		attendanceDays,
	};
}

export function queryAttendanceListPage(classId: string, state: AttendancePageState) {
	return (url: URL) => resolvePageLoad(url, {
		empty: () => emptyAttendanceSlice(classId),
		load: async () => {
			const data = await loadAttendanceSlice(classId);
			state.applySlice(classId, data);
			return data;
		},
		hasItems: listPageHasItems,
	});
}
