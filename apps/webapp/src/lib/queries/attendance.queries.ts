import { academicContext } from '$lib/academic/context.svelte';
import { loadClassAttendancePageData } from '$lib/api/attendance-data';
import { loadClassPeopleData } from '$lib/api/people-data';
import { detailDataContext } from '$lib/detail-data/context.svelte';
import { queryClient } from '$lib/queries/client';
import { listPageHasItems, resolvePageLoad } from '$lib/queries/page-status';

export function queryClassAttendancePage(classId: string) {
	return (url: URL) => resolvePageLoad(url, {
		empty: () => ({ classId }),
		load: async () => {
			const client = queryClient();
			const periodId = academicContext.periodId;
			const [{ attendanceDays }, { students }] = await Promise.all([
				loadClassAttendancePageData(client, classId),
				loadClassPeopleData(client, classId, periodId),
			]);
			detailDataContext.seedAttendanceDays(attendanceDays, { classId });
			detailDataContext.seedStudents(students, { classId });
			return { classId };
		},
		hasItems: listPageHasItems,
	});
}
