import type { components } from '$lib/api/schema';
import type { getBrowserSchoolClient } from '$lib/api/school-client';
import type { EntityQuery } from '@maya-invest/edaya-api-client';
import { ApiError } from '@maya-invest/edaya-api-client';

type SchoolClient = ReturnType<typeof getBrowserSchoolClient>;
type MessageDeliveryRaw = components['schemas']['MessageDelivery'];
export interface InboxRecipient {
	subjectId: string;
	recipientKind: NonNullable<MessageDeliveryRaw['recipientKind']>;
	recipientId: string;
}
export interface InboxFilters { search: string; status: string; type: string }
export interface InboxDelivery {
	id: string;
	announcementId?: string;
	eventKey?: string;
	subjectId: string;
	recipientKind?: MessageDeliveryRaw['recipientKind'];
	recipientId?: string;
	status: MessageDeliveryRaw['status'];
	title: string;
	body: string;
	sentAt?: string;
	readAt?: string;
	createdAt?: string;
	senderName?: string;
	senderState?: 'restricted' | 'unavailable';
	announcementAvailable?: boolean;
}
export const INBOX_PAGE_SIZE = 25;
function toIso(value: unknown): string | undefined {
	return value instanceof Date ? value.toISOString() : typeof value === 'string' ? value : undefined;
}
export function toInboxDelivery(delivery: MessageDeliveryRaw): InboxDelivery {
	return { ...delivery, sentAt: toIso(delivery.sentAt), readAt: toIso(delivery.readAt), createdAt: toIso(delivery.createdAt) };
}
/** Resolve authorized sender metadata with at most two batched reads per page. */
export async function enrichInboxSenders(client: SchoolClient, rows: InboxDelivery[]): Promise<InboxDelivery[]> {
	const ids = [...new Set(rows.flatMap(row => row.announcementId ? [row.announcementId] : []))];
	if (!ids.length)
		return rows;
	let announcements: components['schemas']['Announcement'][];
	try {
		announcements = await client.entities.announcements.list({ id: { $in: ids }, $limit: ids.length });
	}
	catch (error) { return rows.map(row => row.announcementId ? { ...row, senderState: error instanceof ApiError && error.status === 403 ? 'restricted' : 'unavailable' } : row); }
	const authorIds = [...new Set(announcements.flatMap(row => row.createdBy ? [row.createdBy] : []))];
	const names = new Map<string, string>();
	let senderState: InboxDelivery['senderState'];
	if (authorIds.length) {
		try {
			const authors = await client.entities.staffMembers.list({ id: { $in: authorIds }, $limit: authorIds.length });
			for (const author of authors) names.set(author.id, [author.firstName, author.lastName].filter(Boolean).join(' '));
		}
		catch (error) { senderState = error instanceof ApiError && error.status === 403 ? 'restricted' : 'unavailable'; }
	}
	return rows.map((row) => {
		if (!row.announcementId)
			return row;
		const announcement = announcements.find(item => item.id === row.announcementId);
		const senderName = announcement?.createdBy ? names.get(announcement.createdBy) : undefined;
		return { ...row, announcementAvailable: Boolean(announcement), senderName, senderState: !announcement ? 'unavailable' : announcement.createdBy && !senderName ? senderState ?? 'unavailable' : undefined };
	});
}
export function inboxMatchingQuery(recipient: InboxRecipient, filters?: InboxFilters): EntityQuery {
	return {
		...recipient,
		$and: [
			{ $or: [{ eventKey: { $exists: false } }, { eventKey: { $ne: 'conversation.message' } }] },
			...(filters?.search.trim() ? [{ $or: [{ title: { $contains: filters.search.trim().slice(0, 200) } }, { body: { $contains: filters.search.trim().slice(0, 200) } }] }] : []),
		],
		status: filters?.status === 'unread' ? 'sent' : filters?.status === 'read' ? 'read' : { $in: ['sent', 'read'] },
		...(filters?.type === 'announcement' ? { announcementId: { $exists: true } } : filters?.type === 'notification' ? { announcementId: { $exists: false } } : {}),
	};
}
export async function fetchInboxDeliveries(client: SchoolClient, recipient: InboxRecipient, filters?: InboxFilters, offset = 0, limit = INBOX_PAGE_SIZE): Promise<InboxDelivery[]> {
	if (!recipient.subjectId || !recipient.recipientKind || !recipient.recipientId)
		return [];
	const rows = await client.entities.messageDeliveries.list({
		...inboxMatchingQuery(recipient, filters),
		$orderBy: [{ field: 'sentAt', direction: 'desc' }, { field: 'createdAt', direction: 'desc' }, { field: 'id', direction: 'desc' }],
		$limit: limit,
		$offset: offset,
	});
	return enrichInboxSenders(client, rows.map(toInboxDelivery));
}
export async function fetchInboxPage(client: SchoolClient, recipient: InboxRecipient, filters: InboxFilters, limit = INBOX_PAGE_SIZE) {
	if (!recipient.subjectId || !recipient.recipientKind || !recipient.recipientId)
		return { deliveries: [], total: 0 };
	const [deliveries, count] = await Promise.all([
		fetchInboxDeliveries(client, recipient, filters, 0, limit),
		client.entities.messageDeliveries.count(inboxMatchingQuery(recipient, filters)),
	]);
	return { deliveries, total: count.count };
}
