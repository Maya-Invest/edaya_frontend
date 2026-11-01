import type { FamilyFeedbackPageState } from '../family-feedback-page.svelte';
import type { PageQueryRequest } from './family-feedback-page-status';
import { getFamilyFeedbackCampaign, loadFamilyFeedbackSlice } from '$lib/api/family-feedback-data';
import { queryClient } from '$lib/queries/client';
import { listPageHasItems, resolveFamilyFeedbackPageLoad } from './family-feedback-page-status';

export async function loadFamilyFeedbackPageSlice() {
	return loadFamilyFeedbackSlice(queryClient());
}

export function querySchoolFamilyFeedbackPage(state: FamilyFeedbackPageState) {
	return (url: URL, request?: PageQueryRequest) => resolveFamilyFeedbackPageLoad(url, {
		empty: () => ({}),
		load: async (signal) => {
			state.hydrateFiltersFromUrl();
			const data = await loadFamilyFeedbackPageSlice();
			signal.throwIfAborted();
			state.seed(data);
			return {};
		},
		hasItems: listPageHasItems,
		errorMessage: 'Unable to load family feedback campaigns.',
	}, request);
}

export async function ensureFamilyFeedbackDrawerSelection(
	state: FamilyFeedbackPageState,
	campaignId: string,
): Promise<boolean> {
	if (state.findCampaign(campaignId)) {
		return true;
	}
	await state.refreshSlice();
	if (state.findCampaign(campaignId)) {
		return true;
	}
	try {
		const campaign = await getFamilyFeedbackCampaign(queryClient(), campaignId);
		if (!campaign) {
			return false;
		}
		state.appendCampaign(campaign);
		return true;
	}
	catch {
		return false;
	}
}
