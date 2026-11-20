import { afterEach, expect, mock, test } from 'bun:test';
import { ApiError } from '@maya-invest/edaya-api-client';
import type { FamilyFeedbackCampaign } from '../../src/lib/api/family-feedback-types';
import type { FamilyFeedbackPageState } from '../../src/routes/(app)/school/family-feedback/family-feedback-page.svelte';

const session = { authUserId: 'account', userId: 'staff', schoolId: 'school' };
const errors: string[] = [];
let requests = 0, reads = 0;
let command: () => Promise<FamilyFeedbackCampaign>;
let read: () => Promise<FamilyFeedbackCampaign>;
mock.module('$lib/auth/session.svelte', () => ({ authSession: session }));
mock.module('$lib/academic/context.svelte', () => ({ academicContext: { yearId: 'year' } }));
mock.module('$lib/api/school-client', () => ({ getBrowserSchoolClient: () => ({}) }));
mock.module('$lib/toast.svelte', () => ({ toast: { error: (message: string) => errors.push(message), success: () => {} } }));
mock.module('$lib/i18n', () => ({ t: { subscribe: (fn: (value: unknown) => void) => { fn((key: string) => key); return () => {}; } } }));
mock.module('$lib/api/family-feedback-data', () => ({
	createFamilyFeedbackCampaign: async () => ({}), previewFamilyFeedbackAudience: async () => ({}),
	runFamilyFeedbackCampaignCommand: async () => { requests++; return command(); },
	loadStaffFeedbackCampaigns: async () => { reads++; return [await read()]; },
}));
const { openFamilyFeedbackCampaignOnPage, closeFamilyFeedbackCampaignOnPage } = await import('../../src/routes/(app)/school/family-feedback/lib/family-feedback-detail-mutations');
const initial = { id: 'campaign', status: 'draft', moderatorStaffId: 'moderator' } as FamilyFeedbackCampaign;
function page(campaign = initial) {
	let current = { ...campaign };
	const state = {
		findCampaign: () => current,
		patchCampaign: (_id: string, patch: Partial<FamilyFeedbackCampaign>) => { current = { ...current, ...patch }; },
	} as unknown as FamilyFeedbackPageState;
	return { state, current: () => current };
}
afterEach(() => { requests = reads = 0; errors.length = 0; session.schoolId = 'school'; });

test('missing moderator and scheduled close are blocked without sending a command', async () => {
	const p = page({ ...initial, moderatorStaffId: undefined });
	expect(await openFamilyFeedbackCampaignOnPage(p.state, 'campaign')).toBe(false);
	expect(errors).toEqual(['familyFeedback.error.moderatorRequired']);
	expect(await closeFamilyFeedbackCampaignOnPage(page({ ...initial, status: 'scheduled' }).state, 'campaign')).toBe(false);
	expect(requests).toBe(0);
});
test('a successful opening updates the visible status with one command', async () => {
	const p = page(); command = async () => ({ ...initial, status: 'open' });
	expect(await openFamilyFeedbackCampaignOnPage(p.state, 'campaign')).toBe(true);
	expect(p.current().status).toBe('open'); expect(requests).toBe(1); expect(reads).toBe(0);
});
test('domain conflict refreshes for review and preserves the specific moderator reason', async () => {
	const p = page(); command = async () => { throw new ApiError(409, { code: 'FAMILY_FEEDBACK_MODERATOR_CONFLICT' }); };
	read = async () => ({ ...initial, moderatorStaffId: undefined });
	expect(await openFamilyFeedbackCampaignOnPage(p.state, 'campaign')).toBe(false);
	expect(errors).toEqual(['familyFeedback.error.moderatorConflict']);
	expect(p.current().moderatorStaffId).toBeUndefined(); expect(requests).toBe(1); expect(reads).toBe(1);
});
test('stale lifecycle is refreshed without retrying the opening', async () => {
	const p = page(); command = async () => { throw new ApiError(409, { code: 'FAMILY_FEEDBACK_LIFECYCLE_INVALID' }); };
	read = async () => ({ ...initial, status: 'closed' });
	expect(await openFamilyFeedbackCampaignOnPage(p.state, 'campaign')).toBe(false);
	expect(p.current().status).toBe('closed'); expect(requests).toBe(1);
	expect(errors).toEqual(['familyFeedback.error.lifecycle']);
});
test('failed refresh retains the original reason and failed commands do not produce a success', async () => {
	const p = page(); command = async () => { throw new ApiError(409, { code: 'FAMILY_FEEDBACK_MODERATOR_REQUIRED' }); };
	read = async () => { throw new Error('offline'); };
	expect(await openFamilyFeedbackCampaignOnPage(p.state, 'campaign')).toBe(false);
	expect(p.current().status).toBe('draft'); expect(errors).toEqual(['familyFeedback.error.moderatorRequired']); expect(requests).toBe(1);
});
test('late success cannot update a different school', async () => {
	const p = page(); command = async () => { session.schoolId = 'other'; return { ...initial, status: 'open' }; };
	await openFamilyFeedbackCampaignOnPage(p.state, 'campaign');
	expect(p.current().status).toBe('draft');
});
test('late conflict refresh cannot update a different school', async () => {
	const p = page(); command = async () => { throw new ApiError(409, { code: 'FAMILY_FEEDBACK_LIFECYCLE_INVALID' }); };
	read = async () => { session.schoolId = 'other'; return { ...initial, status: 'closed' }; };
	await openFamilyFeedbackCampaignOnPage(p.state, 'campaign');
	expect(p.current().status).toBe('draft'); expect(requests).toBe(1);
});
test('network failure preserves campaign and does not issue a refresh or retry', async () => {
	const p = page(); command = async () => { throw new Error('offline'); };
	expect(await openFamilyFeedbackCampaignOnPage(p.state, 'campaign')).toBe(false);
	expect(p.current().status).toBe('draft'); expect(requests).toBe(1); expect(reads).toBe(0);
});
