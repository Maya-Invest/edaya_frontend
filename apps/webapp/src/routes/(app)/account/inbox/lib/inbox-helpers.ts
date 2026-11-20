import type { InboxDelivery, InboxFilters } from '$lib/api/notifications-inbox-data';

export interface InboxPageSlice {
	deliveries: InboxDelivery[];
	total: number;
	subjectId: string | null;
	selectedDelivery?: InboxDelivery;
	senderName?: string;
	senderState?: 'restricted' | 'unavailable';
	announcementAvailable?: boolean;
}
export function emptyInboxSlice(): InboxPageSlice {
	return { deliveries: [], total: 0, subjectId: null };
}
export function inboxFiltersFromUrl(url: URL): InboxFilters {
	return {
		search: (url.searchParams.get('search') ?? '').slice(0, 200),
		status: ['unread', 'read'].includes(url.searchParams.get('status') ?? '') ? url.searchParams.get('status')! : 'all',
		type: ['announcement', 'notification'].includes(url.searchParams.get('type') ?? '') ? url.searchParams.get('type')! : 'all',
	};
}
export function inboxDeliveryIdFromUrl(url: URL): string | undefined {
	const match = url.pathname.match(/^\/account\/inbox\/([^/]+)\/?$/);
	if (!match?.[1])
		return undefined;
	try {
		return decodeURIComponent(match[1]);
	}
	catch { return match[1]; }
}
