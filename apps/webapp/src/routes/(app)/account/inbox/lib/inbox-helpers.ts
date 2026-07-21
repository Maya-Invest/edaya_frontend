import type { InboxDelivery } from '$lib/api/notifications-inbox-data';

export interface InboxPageSlice {
	deliveries: InboxDelivery[];
	subjectId: string | null;
}

export function emptyInboxSlice(): InboxPageSlice {
	return {
		deliveries: [],
		subjectId: null,
	};
}

export function inboxDeliveryIdFromUrl(url: URL): string | undefined {
	const match = url.pathname.match(/^\/account\/inbox\/([^/]+)$/);
	return match?.[1];
}
