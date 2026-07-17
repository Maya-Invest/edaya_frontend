import type { SchoolNotificationTemplatesRow } from '$lib/api/notification-templates-data';
import {
	fetchSchoolNotificationTemplates,

} from '$lib/api/notification-templates-data';
import { authSession } from '$lib/auth/session.svelte';
import { listPageHasItems, resolvePageLoad } from '$lib/queries/page-status';

export interface NotificationTemplatesPageData {
	schoolId: string | null;
	document: SchoolNotificationTemplatesRow | null;
}

export function queryNotificationTemplatesPage() {
	return (url: URL) => resolvePageLoad(url, {
		empty: (): NotificationTemplatesPageData => ({
			schoolId: null,
			document: null,
		}),
		load: async (): Promise<NotificationTemplatesPageData> => {
			const schoolId = authSession.schoolId;
			if (!schoolId) {
				return { schoolId: null, document: null };
			}
			const document = await fetchSchoolNotificationTemplates(schoolId);
			return { schoolId, document };
		},
		hasItems: listPageHasItems,
		errorMessage: 'Unable to load notification templates.',
	});
}
