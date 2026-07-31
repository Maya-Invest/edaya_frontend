import type { SchoolNotificationTemplatesRow } from '$lib/api/notification-templates-data';

export interface NotificationsPageSlice {
	schoolId: string | null;
	document: SchoolNotificationTemplatesRow | null;
}

export function emptyNotificationsSlice(): NotificationsPageSlice {
	return {
		schoolId: null,
		document: null,
	};
}
