import { academicContext } from '$lib/academic/context.svelte';
import { loadClassPeopleData } from '$lib/api/people-data';
import { loadClassPlanning } from '$lib/api/planning-data';
import { loadClassSchedules } from '$lib/api/schedule-data';
import { loadSessionDetail } from '$lib/api/session-detail-data';
import { detailDataContext } from '$lib/detail-data/context.svelte';
import { queryClient } from '$lib/queries/client';
import { resolvePageLoad } from '$lib/queries/page-status';
import { getClassSubjects } from '$lib/queries/subjects.queries';
import { sessionDetailContext } from '$lib/session-detail/context.svelte';

export function sessionDetailIdFromUrl(url: URL): string | undefined {
	return url.pathname.match(/\/classes\/[^/]+\/timetable\/([^/]+)$/)?.[1];
}

async function seedSessionDrawerForUrl(url: URL) {
	const sessionId = sessionDetailIdFromUrl(url);
	if (!sessionId) {
		return;
	}

	const detail = await loadSessionDetail(queryClient(), sessionId);
	if (detail) {
		sessionDetailContext.hydrate(sessionId, detail);
	}
}

export function queryClassTimetablePage(classId: string) {
	return (url: URL) => resolvePageLoad(url, {
		empty: () => ({ classId }),
		load: async () => {
			const periodId = academicContext.periodId;
			const [planning, schedules, { students }, subjects] = await Promise.all([
				loadClassPlanning(queryClient(), classId),
				loadClassSchedules(queryClient(), classId),
				loadClassPeopleData(queryClient(), classId, periodId),
				getClassSubjects(classId),
			]);
			detailDataContext.seedPlanning(planning, { classId });
			detailDataContext.seedSchedules(schedules, { classId });
			detailDataContext.seedStudents(students, { classId });
			detailDataContext.seedSubjects(subjects, { classId });
			await seedSessionDrawerForUrl(url);
			return { classId };
		},
		hasItems: () => true,
	});
}
