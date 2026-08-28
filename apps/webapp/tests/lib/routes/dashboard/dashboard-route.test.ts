import { describe, expect, it } from 'bun:test';
import { emptyDashboardSlice } from '../../../../src/routes/(app)/dashboard/lib/dashboard-helpers';

describe('dashboard route helpers', () => {
	it('returns an empty slice by default', () => {
		expect(emptyDashboardSlice()).toEqual({
			overview: null,
		});
	});
});
