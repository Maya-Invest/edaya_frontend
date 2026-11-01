import type { PageQueryRequest } from '$lib/queries/page-status';
import type { ActivitiesPageState } from '../activities-page.svelte';
import { fetchActivityById } from '$lib/api/activities-data';
import { listPageHasItems, resolvePageLoad } from '$lib/queries/page-status';
import { ApiError } from '@maya-invest/edaya-api-client';

export function querySchoolActivitiesPage(state: ActivitiesPageState) {
	return (url: URL, request?: PageQueryRequest) => resolvePageLoad(url, {
		empty: () => ({}),
		load: async (signal) => {
			signal.throwIfAborted();
			state.hydrateFiltersFromUrl();
			await state.loadActivities();
			signal.throwIfAborted();
			return {};
		},
		hasItems: listPageHasItems,
		errorMessage: 'Unable to load activities.',
	}, request);
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
