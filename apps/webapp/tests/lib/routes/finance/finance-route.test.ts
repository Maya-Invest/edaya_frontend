import { describe, expect, it } from 'bun:test';
import { billingDetailIdFromUrl } from '../../../../src/routes/(app)/finance/billing/lib/billing-helpers';

describe('finance route helpers', () => {
	it('parses billing id from drawer URL', () => {
		const url = new URL('http://local/finance/billing/sf-1');
		expect(billingDetailIdFromUrl(url)).toBe('sf-1');
	});
});
