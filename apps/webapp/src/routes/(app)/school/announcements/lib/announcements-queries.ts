import type { AnnouncementsPageState } from '../announcements-page.svelte';
import { academicContext } from '$lib/academic/context.svelte';
import { fetchAnnouncements } from '$lib/api/announcements-data';
import { loadGuardiansPeopleData } from '$lib/api/people-data';
import { safeOptionalEntityList } from '$lib/api/safe-entity-access';
import { fetchStaffMembers } from '$lib/api/staff-data';
import { authSession } from '$lib/auth/session.svelte';
import { queryClient } from '$lib/queries/client';
import { listPageHasItems, resolveAnnouncementPageLoad } from './announcement-page-status';

export async function loadAnnouncementsSlice() {
	const schoolId = authSession.schoolId ?? academicContext.schools[0]?.id ?? '';
	const client = queryClient();
	const [announcements, guardiansData, staff] = await Promise.all([
		schoolId
			? safeOptionalEntityList(() => fetchAnnouncements(client, schoolId))
			: Promise.resolve([]),
		loadGuardiansPeopleData(client).catch(() => ({ guardians: [], students: [], totalGuardians: 0 })),
		schoolId && academicContext.yearId
			? safeOptionalEntityList(() => fetchStaffMembers(client, {
					schoolId,
					academicYearId: academicContext.yearId,
				}))
			: Promise.resolve([]),
	]);

	return {
		announcements,
		guardians: guardiansData.guardians,
		students: guardiansData.students,
		staff,
	};
}

export function querySchoolAnnouncementsPage(state: AnnouncementsPageState) {
	return (url: URL) => resolveAnnouncementPageLoad(url, {
		empty: () => ({}),
		load: async () => {
			state.hydrateFiltersFromUrl();
			const data = await loadAnnouncementsSlice();
			state.seed(data);
			return {};
		},
		hasItems: listPageHasItems,
		errorMessage: 'Unable to load announcements.',
	});
}

export async function ensureAnnouncementDrawerSelection(
	state: AnnouncementsPageState,
	announcementId: string,
): Promise<boolean> {
	return state.findAnnouncement(announcementId) !== undefined;
}
