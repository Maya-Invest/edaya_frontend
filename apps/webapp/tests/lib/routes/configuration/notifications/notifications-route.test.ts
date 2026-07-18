import { describe, expect, it } from 'bun:test';
import { emptyNotificationsSlice } from '../../../../../src/routes/(app)/configuration/notifications/lib/notifications-helpers';

describe('notifications route helpers', () => {
	it('returns an empty slice when school context is missing', () => {
		expect(emptyNotificationsSlice()).toEqual({
			schoolId: null,
			document: null,
		});
	});
});
