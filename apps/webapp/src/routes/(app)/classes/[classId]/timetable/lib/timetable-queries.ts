import type { PageQueryRequest } from '$lib/queries/page-status';
import type { TimetablePageSlice } from './timetable-helpers';
import { academicContext } from '$lib/academic/context.svelte';
import { fetchActivityOptions } from '$lib/api/activities-data';
import { loadClassPeopleData } from '$lib/api/people-data';
import { academicYearPlanningRange, loadClassPlanning } from '$lib/api/planning-data';
import { safeOptionalFetch } from '$lib/api/safe-entity-access';
import { loadClassSchedules } from '$lib/api/schedule-data';
import { loadCalendarEvents } from '$lib/api/school-life-data';
import { queryClient } from '$lib/queries/client';
import { resolvePageLoad } from '$lib/queries/page-status';
import { getClassSubjects } from '$lib/queries/subjects.queries';
import { emptyTimetableSlice } from './timetable-helpers';

export async function loadTimetableSlice(classId: string): Promise<TimetablePageSlice> {
	if (!classId) {
		return emptyTimetableSlice(classId);
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
			? safeOptionalFetch(() => fetchActivityOptions(client, schoolId), [])
			: Promise.resolve([]),
		yearId
			? safeOptionalFetch(() => loadCalendarEvents(client, yearId, schoolId), [])
			: Promise.resolve([]),
	]);

	return {
		classId,
		events: planning,
		schedules,
		students: people.students,
		subjects,
		activities,
		schoolYearEvents,
	};
}

export function queryTimetableListPage(classId: string) {
	return (url: URL, request?: PageQueryRequest) => resolvePageLoad(url, {
		empty: () => emptyTimetableSlice(classId),
		load: () => loadTimetableSlice(classId),
		hasItems: () => true,
	}, request);
}
