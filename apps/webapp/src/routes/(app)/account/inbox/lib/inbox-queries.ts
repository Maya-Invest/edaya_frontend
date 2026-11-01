import type { PageQueryRequest } from '$lib/queries/page-status';
import type { InboxPageState } from '../inbox-page.svelte';
import type { InboxPageSlice } from './inbox-helpers';
import { fetchInboxPage, toInboxDelivery, INBOX_PAGE_SIZE, enrichInboxSenders } from '$lib/api/notifications-inbox-data';
import { getBrowserSchoolClient } from '$lib/api/school-client';
import { authSession } from '$lib/auth/session.svelte';
import { resolvePageLoad } from '$lib/queries/page-status';
import { ApiError } from '@maya-invest/edaya-api-client';
import { emptyInboxSlice, inboxDeliveryIdFromUrl, inboxFiltersFromUrl } from './inbox-helpers';

export function inboxIdentity() {
	return [authSession.schoolId, authSession.subjectId, authSession.sessionKind, authSession.userId].join('|');
}
export function inboxRecipient() {
	const { subjectId, sessionKind: recipientKind, userId: recipientId } = authSession;
	return subjectId && recipientKind && recipientId ? { subjectId, recipientKind, recipientId } : null;
}
export async function loadInboxSlice(url: URL, existing?: Pick<InboxPageSlice, 'deliveries' | 'total'>, limit = INBOX_PAGE_SIZE): Promise<InboxPageSlice> {
	const recipient = inboxRecipient();
	if (!recipient)
		return emptyInboxSlice();
	const client = getBrowserSchoolClient();
	const result = existing ?? await fetchInboxPage(client, recipient, inboxFiltersFromUrl(url), limit);
	const selectedId = inboxDeliveryIdFromUrl(url);
	let selectedDelivery = result.deliveries.find(row => row.id === selectedId);
	if (selectedId && !selectedDelivery) {
		try {
			selectedDelivery = toInboxDelivery(await client.entities.messageDeliveries.get(selectedId));
		}
		catch (error) {
			if (!(error instanceof ApiError && error.status === 404))
				throw error;
		}
	}
	if (selectedDelivery && (selectedDelivery.subjectId !== recipient.subjectId || selectedDelivery.recipientKind !== recipient.recipientKind || selectedDelivery.recipientId !== recipient.recipientId)) {
		throw new ApiError(403, {});
	}
	if (selectedDelivery?.announcementId && selectedDelivery.announcementAvailable === undefined && selectedDelivery.senderState === undefined) {
		selectedDelivery = (await enrichInboxSenders(client, [selectedDelivery]))[0];
	}
	const slice: InboxPageSlice = { ...result, subjectId: recipient.subjectId, selectedDelivery, senderName: selectedDelivery?.senderName, senderState: selectedDelivery?.senderState, announcementAvailable: selectedDelivery?.announcementAvailable };
	return slice;
}
export function queryInboxListPage(state: InboxPageState) {
	return async (url: URL, request?: PageQueryRequest) => {
		const identity = inboxIdentity();
		const result = await resolvePageLoad(url, {
			empty: emptyInboxSlice,
			load: async (signal) => {
				const data = await state.loadSlice(url);
				signal.throwIfAborted();
				if (identity !== inboxIdentity())
					throw new DOMException('Inbox profile changed', 'AbortError');
				state.applySlice(data);
				return data;
			},
			hasItems: data => Boolean(data.subjectId),
		}, request);
		return result;
	};
}
