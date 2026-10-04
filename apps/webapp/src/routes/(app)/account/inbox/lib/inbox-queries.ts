import type { InboxDelivery } from '$lib/api/notifications-inbox-data';
import type { PageQueryRequest } from '$lib/queries/page-status';
import type { InboxPageState } from '../inbox-page.svelte';
import type { InboxPageSlice } from './inbox-helpers';
import { fetchInboxDeliveries } from '$lib/api/notifications-inbox-data';
import { getBrowserSchoolClient } from '$lib/api/school-client';
import { authSession } from '$lib/auth/session.svelte';
import { resolvePageLoad } from '$lib/queries/page-status';
import { emptyInboxSlice } from './inbox-helpers';

export async function loadInboxSlice(): Promise<InboxPageSlice> {
	const subjectId = authSession.subjectId;
	const recipientKind = authSession.sessionKind;
	const recipientId = authSession.userId;
	if (!subjectId || !recipientKind || !recipientId) {
		return { deliveries: [], subjectId: null };
	}

	const deliveries = await fetchInboxDeliveries(getBrowserSchoolClient(), { subjectId, recipientKind, recipientId });
	return { deliveries: deliveries.filter(row => row.eventKey !== 'conversation.message'), subjectId };
}

export function queryInboxListPage(state: InboxPageState) {
	return (url: URL, request?: PageQueryRequest) => resolvePageLoad(url, {
		empty: () => emptyInboxSlice(),
		load: async (signal) => {
			const data = await loadInboxSlice();
			signal.throwIfAborted();
			state.applySlice(data);
			return data;
		},
		hasItems: (data: InboxPageSlice) => Boolean(data.subjectId),
		errorMessage: 'Unable to load your inbox.',
	}, request);
}

export type { InboxDelivery };
