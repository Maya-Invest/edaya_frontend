import type { PageQueryRequest } from '$lib/queries/page-status';
import type { ActivitiesPageState } from '../activities-page.svelte';
import { academicContext } from '$lib/academic/context.svelte';
import { queryClient } from '$lib/queries/client';
import { listPageHasItems, resolvePageLoad } from '$lib/queries/page-status';

export function querySchoolActivitiesPage(state: ActivitiesPageState) {
	return (url: URL, request?: PageQueryRequest) => resolvePageLoad(url, {
		empty: () => ({}),
		waitForShell: !academicContext.shellReady,
		load: async (signal) => {
			signal.throwIfAborted();
			await state.refreshList(signal);
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
	signal: AbortSignal,
): Promise<boolean> {
	const scope = state.scope;
	const activity = state.takeListSelection(activityId) ?? (await queryClient().queries.getStaffActivityProfile({ activityId }, { signal })).activity;
	signal.throwIfAborted();
	if (!activity || scope !== state.scope || activityId !== state.selectedId || state.list.denied)
		return false;
	state.appendActivity(activity);
	return true;
}
