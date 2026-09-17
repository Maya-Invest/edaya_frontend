import { describe, expect, it } from 'bun:test';
import type { FamilyFeedbackCampaign } from '../../src/lib/api/family-feedback-types';
import type { FamilyFeedbackPageState } from '../../src/routes/(app)/school/family-feedback/family-feedback-page.svelte';
import { ensureFamilyFeedbackDrawerSelection } from '../../src/routes/(app)/school/family-feedback/lib/family-feedback-queries';

function campaign(id: string): FamilyFeedbackCampaign {
	return {
		id,
		status: 'draft',
		academicYearId: 'year',
		academicPeriodId: 'period',
		classGroupId: 'class',
		classSubjectId: 'subject',
		teacherAssignmentId: 'ta',
		teacherId: 'teacher',
		subjectId: 'sub',
		questionVersion: '1',
	};
}

describe('ensureFamilyFeedbackDrawerSelection', () => {
	it('keeps a campaign already in route state', async () => {
		const state = {
			findCampaign: (id: string) => id === 'camp-1' ? campaign('camp-1') : undefined,
			refreshSlice: async () => {
				throw new Error('should not refresh');
			},
		} as Pick<FamilyFeedbackPageState, 'findCampaign' | 'refreshSlice'>;

		await expect(ensureFamilyFeedbackDrawerSelection(state as FamilyFeedbackPageState, 'camp-1')).resolves.toBe(true);
	});

	it('refreshes the list when the drawer id is not in memory yet', async () => {
		const campaigns: FamilyFeedbackCampaign[] = [];
		const state = {
			findCampaign: (id: string) => campaigns.find(entry => entry.id === id),
			refreshSlice: async () => {
				campaigns.push(campaign('camp-1'));
			},
		} as Pick<FamilyFeedbackPageState, 'findCampaign' | 'refreshSlice'>;

		await expect(ensureFamilyFeedbackDrawerSelection(state as FamilyFeedbackPageState, 'camp-1')).resolves.toBe(true);
	});

	it('returns false when the campaign is still missing after refresh', async () => {
		const state = {
			findCampaign: () => undefined,
			refreshSlice: async () => {},
		} as Pick<FamilyFeedbackPageState, 'findCampaign' | 'refreshSlice'>;

		await expect(ensureFamilyFeedbackDrawerSelection(state as FamilyFeedbackPageState, 'camp-1')).resolves.toBe(false);
	});
});
