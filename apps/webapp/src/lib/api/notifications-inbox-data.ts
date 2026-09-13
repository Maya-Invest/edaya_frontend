import type { components } from '$lib/api/schema';
import type { getBrowserSchoolClient } from '$lib/api/school-client';

type SchoolClient = ReturnType<typeof getBrowserSchoolClient>;
type MessageDeliveryRaw = components['schemas']['MessageDelivery'];

export interface InboxRecipient {
	subjectId: string;
	recipientKind: NonNullable<MessageDeliveryRaw['recipientKind']>;
	recipientId: string;
}

export interface InboxDelivery {
	id: string;
	announcementId?: string;
	eventKey?: string;
	subjectId: string;
	status: MessageDeliveryRaw['status'];
	title: string;
	body: string;
	sentAt?: string;
	readAt?: string;
	createdAt?: string;
}

function toIso(value: unknown): string | undefined {
	if (!value) {
		return undefined;
	}
	if (value instanceof Date) {
		return value.toISOString();
	}
	if (typeof value === 'string') {
		return value;
	}
	return undefined;
}

export async function fetchInboxDeliveries(
	client: SchoolClient,
	recipient: InboxRecipient,
): Promise<InboxDelivery[]> {
	if (!recipient.subjectId || !recipient.recipientKind || !recipient.recipientId)
		return [];
	const deliveries = await client.entities.messageDeliveries.list({ subjectId: recipient.subjectId, recipientKind: recipient.recipientKind, recipientId: recipient.recipientId });
	return (deliveries ?? [])
		.map((delivery: MessageDeliveryRaw) => ({
			id: delivery.id,
			announcementId: delivery.announcementId,
			eventKey: delivery.eventKey,
			subjectId: delivery.subjectId,
			status: delivery.status,
			title: delivery.title,
			body: delivery.body,
			sentAt: toIso(delivery.sentAt),
			readAt: toIso(delivery.readAt),
			createdAt: toIso(delivery.createdAt),
		}))
		.sort((left, right) => {
			const leftTime = Date.parse(left.sentAt ?? left.createdAt ?? '') || 0;
			const rightTime = Date.parse(right.sentAt ?? right.createdAt ?? '') || 0;
			return rightTime - leftTime;
		});
}
