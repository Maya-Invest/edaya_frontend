import { academicContext } from '$lib/academic/context.svelte';
import { authSession } from '$lib/auth/session.svelte';
import { fetchActivities } from '$lib/api/activities-data';
import { fetchAnnouncements } from '$lib/api/announcements-data';
import { loadGuardiansPeopleData } from '$lib/api/people-data';
import { safeOptionalEntityList, safeOptionalFetch } from '$lib/api/safe-entity-access';
import { loadAbsences, loadCalendarEvents, loadIncidentRouteData } from '$lib/api/school-life-data';
import { fetchStaffMembers } from '$lib/api/staff-data';
import { detailDataContext } from '$lib/detail-data/context.svelte';
import { queryClient } from '$lib/queries/client';
import { ApiError } from '$api-client';
import { listPageHasItems, resolvePageLoad } from '$lib/queries/page-status';

export function querySchoolAnnouncementsPage() {
	return (url: URL) => resolvePageLoad(url, {
		empty: () => ({}),
		load: async () => {
			const schoolId = academicContext.schools[0]?.id ?? '';
			const client = queryClient();
			const [announcements, guardiansData, staff] = await Promise.all([
				schoolId
					? safeOptionalEntityList(() => fetchAnnouncements(client, schoolId))
					: Promise.resolve([]),
				loadGuardiansPeopleData(client).catch(() => ({ guardians: [], students: [], totalGuardians: 0 })),
				schoolId
					? safeOptionalEntityList(() => fetchStaffMembers(client, {
							schoolId,
							academicYearId: academicContext.yearId,
						}))
					: Promise.resolve([]),
			]);
			detailDataContext.seedAnnouncements(announcements);
			detailDataContext.seedGuardians(guardiansData.guardians);
			detailDataContext.seedStaff(staff);
			return {};
		},
		hasItems: listPageHasItems,
	});
}

export function querySchoolActivitiesPage() {
	return (url: URL) => resolvePageLoad(url, {
		empty: () => ({}),
		load: async () => {
			const schoolId = authSession.schoolId ?? academicContext.schools[0]?.id ?? '';
			if (!schoolId) {
				detailDataContext.seedActivities([]);
				return {};
			}

			const activities = await safeOptionalFetch(
				() => fetchActivities(queryClient(), schoolId),
				[],
			);
			detailDataContext.seedActivities(activities);
			return {};
		},
		hasItems: listPageHasItems,
		errorMessage: 'Unable to load activities.',
	});
}

export function querySchoolCalendarPage() {
	return (url: URL) => resolvePageLoad(url, {
		empty: () => ({}),
		load: async () => {
			const client = queryClient();
			const classIds = academicContext.classes.map(entry => entry.id);
			const [events, absences] = await Promise.all([
				loadCalendarEvents(client, academicContext.yearId).catch((error) => {
					if (error instanceof ApiError && (error.status === 403 || error.status === 401)) {
						return [];
					}
					throw error;
				}),
				loadAbsences(client, classIds).catch((error) => {
					if (error instanceof ApiError && (error.status === 403 || error.status === 401)) {
						return [];
					}
					throw error;
				}),
			]);
			detailDataContext.seedSchoolYearEvents(events);
			detailDataContext.seedAbsences(absences);
			return {};
		},
		hasItems: listPageHasItems,
	});
}

export function querySchoolEventsPage() {
	return (url: URL) => resolvePageLoad(url, {
		empty: () => ({}),
		load: async () => {
			const { incidents, students } = await loadIncidentRouteData(queryClient(), {
				schoolId: academicContext.schools[0]?.id ?? '',
				academicYearId: academicContext.yearId,
			});
			detailDataContext.seedIncidents(incidents);
			detailDataContext.seedStudents(students);
			return {};
		},
		hasItems: listPageHasItems,
	});
}
