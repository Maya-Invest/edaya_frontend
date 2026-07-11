import type { ActivitiesPageState } from '../activities-page.svelte';
import { ApiError } from '@edaya/api-client';
import { listPageHasItems, resolvePageLoad } from '$lib/queries/page-status';
import { fetchActivityById } from '$lib/api/activities-data';

export function querySchoolActivitiesPage(state: ActivitiesPageState) {
	return (url: URL) => resolvePageLoad(url, {
		empty: () => ({}),
		load: async () => {
			state.hydrateFiltersFromUrl();
			await state.loadActivities();
			return {};
		},
		hasItems: listPageHasItems,
		errorMessage: 'Unable to load activities.',
	});
}

export async function ensureActivityDrawerSelection(
	state: ActivitiesPageState,
	activityId: string,
): Promise<boolean> {
	try {
		if (state.findActivity(activityId)) {
			return true;
		}
		const activity = await fetchActivityById(state.client(), activityId);
		if (!activity) {
			return false;
		}
		state.mergeActivities([activity]);
		return true;
	}
	catch (error) {
		if (error instanceof ApiError && (error.status === 403 || error.status === 401)) {
			return true;
		}
		throw error;
	}
}
