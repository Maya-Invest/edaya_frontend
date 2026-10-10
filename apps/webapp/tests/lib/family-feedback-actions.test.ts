import { describe, expect, test } from 'bun:test';
import type { FamilyFeedbackCampaign } from '../../src/lib/api/family-feedback-types';
import { FAMILY_FEEDBACK_STATUSES } from '../../src/lib/api/family-feedback-types';
import { familyFeedbackActionAvailable, familyFeedbackActionBlocker } from '../../src/routes/(app)/school/family-feedback/lib/family-feedback-actions';
import { familyFeedbackErrorKey } from '../../src/routes/(app)/school/family-feedback/lib/family-feedback-errors';
import { ApiError } from '@maya-invest/edaya-api-client';

const now = Date.parse('2026-10-10T12:00:00Z');
const draft = { id: 'campaign', status: 'draft', moderatorStaffId: 'staff', opensAt: '2026-10-11T12:00:00Z', closesAt: '2026-10-15T12:00:00Z' } as FamilyFeedbackCampaign;

describe('family feedback action prerequisites', () => {
	test('requires a moderator before opening or scheduling', () => {
		for (const action of ['open', 'schedule'] as const) {
			expect(familyFeedbackActionBlocker({ ...draft, moderatorStaffId: undefined }, action, now)).toBe('familyFeedback.error.moderatorRequired');
			expect(familyFeedbackActionBlocker(draft, action, now)).toBeUndefined();
		}
	});
	test('manual opening allows absent dates but scheduling needs both', () => {
		const campaign = { ...draft, opensAt: undefined, closesAt: undefined };
		expect(familyFeedbackActionBlocker(campaign, 'open', now)).toBeUndefined();
		expect(familyFeedbackActionBlocker(campaign, 'schedule', now)).toBe('familyFeedback.error.scheduleRequired');
	});
	test('rejects elapsed cutoff, invalid dates and reversed windows', () => {
		expect(familyFeedbackActionBlocker({ ...draft, closesAt: new Date(now).toISOString() }, 'open', now)).toBe('familyFeedback.error.closed');
		expect(familyFeedbackActionBlocker({ ...draft, closesAt: 'invalid' }, 'schedule', now)).toBe('familyFeedback.error.scheduleInvalid');
		expect(familyFeedbackActionBlocker({ ...draft, opensAt: '2026-10-20T12:00:00Z' }, 'schedule', now)).toBe('familyFeedback.error.scheduleInvalid');
	});
	test('only open campaigns close and only closed campaigns accept theme drafts', () => {
		for (const status of FAMILY_FEEDBACK_STATUSES) {
			expect(familyFeedbackActionAvailable({ ...draft, status }, 'close')).toBe(status === 'open');
			expect(familyFeedbackActionAvailable({ ...draft, status }, 'theme')).toBe(status === 'closed');
			expect(familyFeedbackActionAvailable({ ...draft, status }, 'archive')).toBe(status === 'published' || status === 'cancelled');
			expect(familyFeedbackActionAvailable({ ...draft, status }, 'assign-moderator')).toBe(status !== 'published' && status !== 'archived');
		}
	});
	test('cannot reopen a closed campaign or publish purged answers', () => {
		expect(familyFeedbackActionBlocker({ ...draft, status: 'closed' }, 'open', now)).toBe('familyFeedback.error.lifecycle');
		expect(familyFeedbackActionBlocker({ ...draft, status: 'closed', answersPurgedAt: '2026-10-09' }, 'publish', now)).toBe('familyFeedback.error.purged');
	});
});

test('domain conflicts retain actionable error keys; unknown errors use the shared fallback', () => {
	expect(familyFeedbackErrorKey(new ApiError(409, { code: 'FAMILY_FEEDBACK_MODERATOR_REQUIRED' }))).toBe('familyFeedback.error.moderatorRequired');
	expect(familyFeedbackErrorKey(new ApiError(409, { code: 'FAMILY_FEEDBACK_MODERATOR_CONFLICT' }))).toBe('familyFeedback.error.moderatorConflict');
	expect(familyFeedbackErrorKey(new ApiError(409, { code: 'SOME_OTHER_CONFLICT' }))).toBeUndefined();
	expect(familyFeedbackErrorKey(new ApiError(409, { code: 'constructor' }))).toBeUndefined();
	expect(familyFeedbackErrorKey(new Error('offline'))).toBeUndefined();
});
