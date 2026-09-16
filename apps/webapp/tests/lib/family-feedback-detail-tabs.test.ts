import { describe, expect, it } from 'bun:test';
import {
	activeFamilyFeedbackDetailTab,
	isFamilyFeedbackDetailTabSegment,
} from '../../src/routes/(app)/school/family-feedback/lib/family-feedback-detail-tabs';
import { familyFeedbackDetailIdFromUrl } from '../../src/routes/(app)/school/family-feedback/lib/family-feedback-selectors';

describe('family feedback drawer tabs', () => {
	it('reads the campaign id from tabbed drawer URLs', () => {
		expect(familyFeedbackDetailIdFromUrl(new URL('http://local/school/family-feedback'))).toBeUndefined();
		expect(familyFeedbackDetailIdFromUrl(new URL('http://local/school/family-feedback/camp-1/setup'))).toBe('camp-1');
		expect(familyFeedbackDetailIdFromUrl(new URL('http://local/school/family-feedback/setup'))).toBeUndefined();
		expect(isFamilyFeedbackDetailTabSegment('moderation')).toBe(true);
		expect(activeFamilyFeedbackDetailTab('/school/family-feedback/camp-1/results', 'camp-1')).toBe('results');
	});
});
