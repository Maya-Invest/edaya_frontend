import type { InboxDelivery } from '$lib/api/notifications-inbox-data';
import type { InboxPageState } from '../inbox-page.svelte';
import type { InboxPageSlice } from './inbox-helpers';
import { fetchInboxDeliveries } from '$lib/api/notifications-inbox-data';
import { getBrowserSchoolClient } from '$lib/api/school-client';
import { authSession } from '$lib/auth/session.svelte';
import { resolvePageLoad } from '$lib/queries/page-status';
import { emptyInboxSlice } from './inbox-helpers';

export async function loadInboxSlice(): Promise<InboxPageSlice> {
	const subjectId = authSession.subjectId;
	if (!subjectId) {
		return { deliveries: [], subjectId: null };
	}

	const deliveries = await fetchInboxDeliveries(getBrowserSchoolClient(), subjectId);
	return { deliveries, subjectId };
}

export function queryInboxListPage(state: InboxPageState) {
	return (url: URL) => resolvePageLoad(url, {
		empty: () => emptyInboxSlice(),
		load: async () => {
			const data = await loadInboxSlice();
			state.applySlice(data);
			return data;
		},
		hasItems: (data: InboxPageSlice) => Boolean(data.subjectId),
		errorMessage: 'Unable to load your inbox.',
	});
}

export type { InboxDelivery };
