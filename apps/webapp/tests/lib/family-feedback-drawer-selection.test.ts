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

	it('resolves a missing selection once by ID', async () => {
		const requests: string[] = [];
		const campaigns: FamilyFeedbackCampaign[] = [];
		const state = {
			selectedId: 'camp-1', findCampaign: () => undefined,
			readCampaign: async (id: string) => { requests.push(id); return [campaign(id)]; },
			appendCampaign: (row: FamilyFeedbackCampaign) => campaigns.push(row),
		};
		await expect(ensureFamilyFeedbackDrawerSelection(state as unknown as FamilyFeedbackPageState, 'camp-1')).resolves.toBe(true);
		expect(requests).toEqual(['camp-1']);
		expect(campaigns.map(row => row.id)).toEqual(requests);
	});

	it('returns false for an unavailable campaign', async () => {
		const state = { findCampaign: () => undefined, readCampaign: async () => [] };
		await expect(ensureFamilyFeedbackDrawerSelection(state as unknown as FamilyFeedbackPageState, 'camp-1')).resolves.toBe(false);
	});
});
