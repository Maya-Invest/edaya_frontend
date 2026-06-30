import { academicContext } from '$lib/academic/context.svelte';
import { fetchActivities } from '$lib/api/activities-data';
import { fetchAnnouncements } from '$lib/api/announcements-data';
import { loadPeopleData, loadGuardiansPeopleData } from '$lib/api/people-data';
import { loadAbsences, loadCalendarEvents, loadIncidentRouteData } from '$lib/api/school-life-data';
import { fetchStaffMembers } from '$lib/api/staff-data';
import { detailDataContext } from '$lib/detail-data/context.svelte';
import { queryClient } from '$lib/queries/client';
import { listPageHasItems, resolvePageLoad } from '$lib/queries/page-status';

export function querySchoolAnnouncementsPage() {
	return (url: URL) => resolvePageLoad(url, {
		empty: () => ({}),
		load: async () => {
			const schoolId = academicContext.schools[0]?.id ?? '';
			const [announcements, people, guardiansData, staff] = await Promise.all([
				fetchAnnouncements(queryClient(), schoolId),
				loadPeopleData(queryClient()),
				loadGuardiansPeopleData(queryClient()),
				fetchStaffMembers(queryClient(), {
					schoolId,
					academicYearId: academicContext.yearId,
				}),
			]);
			detailDataContext.seedAnnouncements(announcements);
			detailDataContext.seedStudents(people.students);
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
			const activities = await fetchActivities(
				queryClient(),
				academicContext.schools[0]?.id ?? '',
			);
			detailDataContext.seedActivities(activities);
			return {};
		},
		hasItems: listPageHasItems,
	});
}

export function querySchoolCalendarPage() {
	return (url: URL) => resolvePageLoad(url, {
		empty: () => ({}),
		load: async () => {
			const [events, absences] = await Promise.all([
				loadCalendarEvents(queryClient(), academicContext.yearId),
				loadAbsences(queryClient(), academicContext.classes.map(entry => entry.id)),
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
