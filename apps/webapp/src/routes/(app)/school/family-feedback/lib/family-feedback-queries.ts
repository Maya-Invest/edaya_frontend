import type { FamilyFeedbackPageState } from '../family-feedback-page.svelte';
import { loadFamilyFeedbackSlice } from '$lib/api/family-feedback-data';
import { queryClient } from '$lib/queries/client';
import { listPageHasItems, resolveFamilyFeedbackPageLoad } from './family-feedback-page-status';

export async function loadFamilyFeedbackPageSlice() {
	return loadFamilyFeedbackSlice(queryClient());
}

export function querySchoolFamilyFeedbackPage(state: FamilyFeedbackPageState) {
	return (url: URL) => resolveFamilyFeedbackPageLoad(url, {
		empty: () => ({}),
		load: async () => {
			state.hydrateFiltersFromUrl();
			const data = await loadFamilyFeedbackPageSlice();
			state.seed(data);
			return {};
		},
		hasItems: listPageHasItems,
		errorMessage: 'Unable to load family feedback campaigns.',
	});
}

export async function ensureFamilyFeedbackDrawerSelection(
	state: FamilyFeedbackPageState,
	campaignId: string,
): Promise<boolean> {
	if (state.findCampaign(campaignId)) {
		return true;
	}
	return false;
}
