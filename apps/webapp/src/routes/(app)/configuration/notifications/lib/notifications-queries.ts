import type { NotificationsPageState } from '../notifications-page.svelte';
import { fetchSchoolNotificationTemplates } from '$lib/api/notification-templates-data';
import { authSession } from '$lib/auth/session.svelte';
import { listPageHasItems, resolvePageLoad } from '$lib/queries/page-status';
import { emptyNotificationsSlice } from './notifications-helpers';

export async function loadNotificationsSlice() {
	const schoolId = authSession.schoolId;
	if (!schoolId) {
		return emptyNotificationsSlice();
	}
	const document = await fetchSchoolNotificationTemplates(schoolId);
	return { schoolId, document };
}

export function queryNotificationsListPage(state: NotificationsPageState) {
	return (url: URL) => resolvePageLoad(url, {
		empty: () => emptyNotificationsSlice(),
		load: async () => {
			const data = await loadNotificationsSlice();
			state.applySlice(data);
			return data;
		},
		hasItems: listPageHasItems,
		errorMessage: 'Unable to load notification templates.',
	});
}
