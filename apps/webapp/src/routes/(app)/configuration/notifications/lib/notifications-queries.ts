import type { NotificationsPageState } from '../notifications-page.svelte';
import { academicContext } from '$lib/academic/context.svelte';
import { fetchSchoolNotificationTemplates } from '$lib/api/notification-templates-data';
import { authSession } from '$lib/auth/session.svelte';
import { listPageHasItems, resolvePageLoad } from '$lib/queries/page-status';
import { ApiError } from '@maya-invest/edaya-api-client';
import { emptyNotificationsSlice } from './notifications-helpers';

function resolveSchoolId(): string | null {
	return authSession.schoolId ?? academicContext.schools[0]?.id ?? null;
}

export async function loadNotificationsSlice() {
	const schoolId = resolveSchoolId();
	if (!schoolId) {
		return emptyNotificationsSlice();
	}

	try {
		const document = await fetchSchoolNotificationTemplates(schoolId);
		return { schoolId, document };
	}
	catch (error) {
		if (error instanceof ApiError && (error.status === 403 || error.status === 401)) {
			return emptyNotificationsSlice();
		}
		throw error;
	}
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
