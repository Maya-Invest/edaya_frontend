import type { AnnouncementsPageState } from '../announcements-page.svelte';
import type { PageQueryRequest } from './announcement-page-status';
import { academicContext } from '$lib/academic/context.svelte';
import { fetchAnnouncements } from '$lib/api/announcements-data';
import { safeOptionalEntityList } from '$lib/api/safe-entity-access';
import { authSession } from '$lib/auth/session.svelte';
import { queryClient } from '$lib/queries/client';
import { listPageHasItems, resolveAnnouncementPageLoad } from './announcement-page-status';

export async function loadAnnouncementsSlice(signal?: AbortSignal) {
	const schoolId = authSession.schoolId ?? academicContext.schools[0]?.id ?? '';
	const announcements = schoolId
		? await safeOptionalEntityList(() => fetchAnnouncements(queryClient(), schoolId, signal))
		: [];
	return { announcements };
}

export function querySchoolAnnouncementsPage(state: AnnouncementsPageState) {
	return (url: URL, request?: PageQueryRequest) => resolveAnnouncementPageLoad(url, {
		empty: () => ({}),
		load: async (signal) => {
			state.hydrateFiltersFromUrl();
			const data = await loadAnnouncementsSlice(signal);
			signal.throwIfAborted();
			state.seed(data);
			return {};
		},
		hasItems: listPageHasItems,
		errorMessage: 'Unable to load announcements.',
	}, request);
}

export async function ensureAnnouncementDrawerSelection(
	state: AnnouncementsPageState,
	announcementId: string,
): Promise<boolean> {
	return state.findAnnouncement(announcementId) !== undefined;
}
