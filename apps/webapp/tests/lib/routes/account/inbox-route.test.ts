import { describe, expect, it } from 'bun:test';
import { inboxDeliveryIdFromUrl } from '../../../../src/routes/(app)/account/inbox/lib/inbox-helpers';

describe('inbox route helpers', () => {
	it('parses delivery id from inbox URL', () => {
		const url = new URL('http://local/account/inbox/delivery-1');
		expect(inboxDeliveryIdFromUrl(url)).toBe('delivery-1');
	});
	it('resolves encoded delivery identifiers on direct links', () => {
		const id = 'delivery:v2:school:announcement:subject:staff:actor';
		expect(inboxDeliveryIdFromUrl(new URL(`http://local/account/inbox/${encodeURIComponent(id)}`))).toBe(id);
	});
	it('handles missing and malformed delivery identifiers', () => {
		expect(inboxDeliveryIdFromUrl(new URL('http://local/account/inbox'))).toBeUndefined();
		expect(inboxDeliveryIdFromUrl(new URL('http://local/account/inbox/%broken'))).toBe('%broken');
	});
});
