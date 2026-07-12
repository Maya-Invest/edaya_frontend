import { academicContext } from '$lib/academic/context.svelte';
import { fetchActivities } from '$lib/api/activities-data';
import { loadClassPeopleData } from '$lib/api/people-data';
import { academicYearPlanningRange, findPlanningEventById, loadClassPlanning } from '$lib/api/planning-data';
import { safeOptionalFetch } from '$lib/api/safe-entity-access';
import { loadCalendarEvents } from '$lib/api/school-life-data';
import { loadClassSchedules } from '$lib/api/schedule-data';
import { loadPlanningOccurrenceDetail } from '$lib/api/session-detail-data';
import { queryClient } from '$lib/queries/client';
import { resolvePageLoad } from '$lib/queries/page-status';
import { getClassSubjects } from '$lib/queries/subjects.queries';
import { sessionDetailContext } from '$lib/session-detail/context.svelte';

export function sessionDetailIdFromUrl(url: URL): string | undefined {
	return url.pathname.match(/\/classes\/[^/]+\/timetable\/([^/]+)$/)?.[1];
}

async function seedSessionDrawerForUrl(
	url: URL,
	planning: Awaited<ReturnType<typeof loadClassPlanning>>,
) {
	const sessionId = sessionDetailIdFromUrl(url);
	if (!sessionId) {
		return;
	}

	const event = findPlanningEventById(planning, sessionId);
	const detail = await loadPlanningOccurrenceDetail(
		queryClient(),
		event ?? { id: sessionId, kind: 'lesson' },
	);
	if (detail) {
		sessionDetailContext.hydrate(sessionId, detail);
	}
}

export interface ClassTimetablePageHooks {
	seedData?: (data: {
		planning: Awaited<ReturnType<typeof loadClassPlanning>>;
		schedules: Awaited<ReturnType<typeof loadClassSchedules>>;
		people: Awaited<ReturnType<typeof loadClassPeopleData>>;
		subjects: Awaited<ReturnType<typeof getClassSubjects>>;
		activities: Awaited<ReturnType<typeof fetchActivities>>;
		schoolYearEvents: Awaited<ReturnType<typeof loadCalendarEvents>>;
	}) => void;
	loadTeacherConstraints?: () => Promise<void>;
}

export function queryClassTimetablePage(classId: string, hooks: ClassTimetablePageHooks = {}) {
	return (url: URL) => resolvePageLoad(url, {
		empty: () => ({ classId }),
		load: async () => {
			if (!classId) {
				return { classId };
			}
			const periodId = academicContext.periodId;
			const schoolId = academicContext.schools[0]?.id ?? '';
			const client = queryClient();
			const yearId = academicContext.yearId;
			const [planning, schedules, people, subjects, activities, schoolYearEvents] = await Promise.all([
				safeOptionalFetch(
					() => loadClassPlanning(client, classId, {
						periodId,
						range: academicYearPlanningRange(academicContext.year),
					}),
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
				yearId
					? safeOptionalFetch(() => loadCalendarEvents(client, yearId), [])
					: Promise.resolve([]),
			]);
			hooks.seedData?.({ planning, schedules, people, subjects, activities, schoolYearEvents });
			await hooks.loadTeacherConstraints?.();
			await seedSessionDrawerForUrl(url, planning);
			return { classId };
		},
		hasItems: () => true,
	});
}
