import type { FamilyFeedbackPageState } from '../family-feedback-page.svelte';
import type { PageQueryRequest } from './family-feedback-page-status';
import { listPageHasItems, resolveFamilyFeedbackPageLoad } from './family-feedback-page-status';

export function querySchoolFamilyFeedbackPage(state: FamilyFeedbackPageState) {
	return (url: URL, request?: PageQueryRequest) => resolveFamilyFeedbackPageLoad(url, {
		empty: () => ({}),
		load: async (signal) => {
			state.hydrateFiltersFromUrl();
			await state.refreshSlice(signal);
			return {};
		},
		hasItems: listPageHasItems,
		errorMessage: 'Unable to load family feedback campaigns.',
	}, request);
}

export async function ensureFamilyFeedbackDrawerSelection(
	state: FamilyFeedbackPageState,
	campaignId: string,
	signal?: AbortSignal,
): Promise<boolean> {
	if (state.findCampaign(campaignId)) {
		return true;
	}
	const scope = state.optionScope;
	const generation = state.detailGeneration;
	const [campaign] = await state.readCampaign(campaignId, signal);
	signal?.throwIfAborted();
	if (!campaign)
		return false;
	if (state.selectedId === campaignId && scope === state.optionScope && generation === state.detailGeneration)
		state.appendCampaign(campaign);
	return true;
}
