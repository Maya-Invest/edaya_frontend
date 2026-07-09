import { academicContext } from '$lib/academic/context.svelte';
import { fetchActivities } from '$lib/api/activities-data';
import { loadClassPeopleData } from '$lib/api/people-data';
import { findPlanningEventById, loadClassPlanning } from '$lib/api/planning-data';
import { safeOptionalFetch } from '$lib/api/safe-entity-access';
import { loadClassSchedules } from '$lib/api/schedule-data';
import { loadPlanningOccurrenceDetail } from '$lib/api/session-detail-data';
import { detailDataContext } from '$lib/detail-data/context.svelte';
import { queryClient } from '$lib/queries/client';
import { resolvePageLoad } from '$lib/queries/page-status';
import { getClassSubjects } from '$lib/queries/subjects.queries';
import { sessionDetailContext } from '$lib/session-detail/context.svelte';

export function sessionDetailIdFromUrl(url: URL): string | undefined {
	return url.pathname.match(/\/classes\/[^/]+\/timetable\/([^/]+)$/)?.[1];
}

async function seedSessionDrawerForUrl(url: URL, classId: string) {
	const sessionId = sessionDetailIdFromUrl(url);
	if (!sessionId) {
		return;
	}

	const event = findPlanningEventById(detailDataContext.planningForClass(classId), sessionId);
	const detail = await loadPlanningOccurrenceDetail(
		queryClient(),
		event ?? { id: sessionId, kind: 'lesson' },
	);
	if (detail) {
		sessionDetailContext.hydrate(sessionId, detail);
	}
}

export function queryClassTimetablePage(classId: string) {
	return (url: URL) => resolvePageLoad(url, {
		empty: () => ({ classId }),
		load: async () => {
			const periodId = academicContext.periodId;
			const schoolId = academicContext.schools[0]?.id ?? '';
			const client = queryClient();
			const [planning, schedules, people, subjects, activities] = await Promise.all([
				safeOptionalFetch(
					() => loadClassPlanning(client, classId, { periodId }),
					[],
				),
				safeOptionalFetch(() => loadClassSchedules(client, classId), []),
				safeOptionalFetch(
					() => loadClassPeopleData(client, classId, periodId),
					{ students: [], guardians: [] },
				),
				safeOptionalFetch(() => getClassSubjects(classId), []),
				schoolId
					? safeOptionalFetch(() => fetchActivities(client, schoolId), [])
					: Promise.resolve([]),
			]);
			detailDataContext.seedPlanning(planning, { classId });
			detailDataContext.seedSchedules(schedules, { classId });
			detailDataContext.seedStudents(people.students, { classId });
			detailDataContext.seedSubjects(subjects, { classId });
			detailDataContext.seedActivities(activities);
			await seedSessionDrawerForUrl(url, classId);
			return { classId };
		},
		hasItems: () => true,
	});
}
