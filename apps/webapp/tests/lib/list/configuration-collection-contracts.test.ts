import type { SchoolNotificationTemplatesRow } from '$lib/api/notification-templates-data';
import { enabledChannelsForTemplateKey } from '$lib/notification-templates/catalog';
import { describe, expect, it } from 'bun:test';
import { matchesNotificationTemplate, notificationListFilters } from '../../../src/routes/(app)/configuration/notifications/lib/notifications-list-filters';

describe('complete configuration collection matching', () => {
	it('matches enabled channels, not merely supported channels, and never assumes settings for a missing document', () => {
		const document = { announcementPublished: { enable_email: false, enable_push: true, enable_sms: false } } as SchoolNotificationTemplatesRow;
		expect(enabledChannelsForTemplateKey(document, 'announcement.published')).toEqual(['in_app', 'push']);
		expect(matchesNotificationTemplate('announcement.published', 'Annonce publiée', document, { q: 'ANNONCE', channel: 'push' })).toBe(true);
		expect(matchesNotificationTemplate('announcement.published', 'Annonce publiée', document, { q: '', channel: 'email' })).toBe(false);
		expect(enabledChannelsForTemplateKey(null, 'announcement.published')).toBeNull();
		expect(matchesNotificationTemplate('announcement.published', 'Annonce', null, { q: '', channel: 'push' })).toBe(false);
	});

	it('retains template detail and search when channel filters reset', () => {
		const url = new URL('http://local/configuration/notifications/announcement.published?q=annonce&channel=push');
		expect(notificationListFilters.write(url, { ...notificationListFilters.read(url), channel: 'all' })).toBe('/configuration/notifications/announcement.published?q=annonce');
		expect(notificationListFilters.read(new URL('http://local/?channel=unsupported'))).toEqual({ q: '', channel: 'all' });
	});
});
