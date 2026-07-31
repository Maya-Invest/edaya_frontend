import { describe, expect, it } from 'bun:test';
import { emptyNotificationSettingsSlice } from '../../../../src/routes/(app)/account/notifications/lib/notification-settings-helpers';

describe('notification settings route helpers', () => {
	it('returns an empty slice by default', () => {
		expect(emptyNotificationSettingsSlice()).toEqual({
			settings: null,
			staffSettings: null,
			loginEmail: null,
			studentNames: {},
			kind: null,
		});
	});
});
