import { academicContext } from '$lib/academic/context.svelte';
import { fetchActivities } from '$lib/api/activities-data';
import { authSession } from '$lib/auth/session.svelte';
import { detailDataContext } from '$lib/detail-data/context.svelte';
import { queryClient } from '$lib/queries/client';
import { listPageHasItems, resolvePageLoad } from '$lib/queries/page-status';
import { safeOptionalFetch } from '$lib/api/safe-entity-access';

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
