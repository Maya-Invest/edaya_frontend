import type { SchoolNotificationTemplatesRow } from '$lib/api/notification-templates-data';
import type { NotificationTemplateKey } from '$lib/notification-templates/catalog';
import { defineUrlFilterCodec } from '$lib/list/url-filter-codec';
import { enabledChannelsForTemplateKey } from '$lib/notification-templates/catalog';

export const notificationListFilters = defineUrlFilterCodec({
	q: { type: 'search', default: '' },
	channel: { type: 'enum', default: 'all', values: ['all', 'in_app', 'email', 'push', 'sms'] as const },
});

/** The fixed catalog and complete school document cover every supported template. */
export function matchesNotificationTemplate(key: NotificationTemplateKey, label: string, document: SchoolNotificationTemplatesRow | null, filters: ReturnType<typeof notificationListFilters.read>): boolean {
	const channels: readonly string[] | null = enabledChannelsForTemplateKey(document, key);
	return label.toLocaleLowerCase().includes(filters.q.trim().toLocaleLowerCase())
		&& (filters.channel === 'all' || Boolean(channels?.includes(filters.channel)));
}
