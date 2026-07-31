import { describe, expect, it } from 'bun:test';
import {
	emptyInboxSlice,
	inboxDeliveryIdFromUrl,
} from '../../../../src/routes/(app)/account/inbox/lib/inbox-helpers';

describe('inbox route helpers', () => {
	it('parses delivery id from inbox URL', () => {
		const url = new URL('http://local/account/inbox/delivery-1');
		expect(inboxDeliveryIdFromUrl(url)).toBe('delivery-1');
	});

	it('returns an empty slice by default', () => {
		expect(emptyInboxSlice()).toEqual({
			deliveries: [],
			subjectId: null,
		});
	});
});
