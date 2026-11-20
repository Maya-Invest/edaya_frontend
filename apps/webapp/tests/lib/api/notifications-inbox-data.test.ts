import { fetchInboxDeliveries, fetchInboxPage, inboxMatchingQuery, INBOX_PAGE_SIZE } from '$lib/api/notifications-inbox-data';
import { createRecordingSchoolClient } from '$tests/support/recording-school-client';
import { describe, expect, it } from 'bun:test';

const filters = { search: '  Frais 100%_  ', status: 'unread', type: 'announcement' };
const scope = { subjectId: 'person', recipientKind: 'staff' as const, recipientId: 'staff-owner' };
describe('personal inbox recipient filtering', () => {
	it('constrains list and matching counts to login and selected profile, including owners', async () => {
		for (const recipient of [scope, { ...scope, recipientKind: 'guardian' as const, recipientId: 'guardian' }, { ...scope, recipientKind: 'teacher' as const, recipientId: 'teacher' }]) {
			const { client, requests } = createRecordingSchoolClient([[], { count: 42 }]);
			expect(await fetchInboxPage(client, recipient, filters)).toEqual({ deliveries: [], total: 42 });
			const query = inboxMatchingQuery(recipient, filters);
			expect(requests[0]).toEqual({ method: 'POST', path: '/core/entities/message-deliveries/list', body: { ...query, $orderBy: [{ field: 'sentAt', direction: 'desc' }, { field: 'createdAt', direction: 'desc' }, { field: 'id', direction: 'desc' }], $limit: INBOX_PAGE_SIZE, $offset: 0 } });
			expect(requests[1]).toEqual({ method: 'POST', path: '/core/entities/message-deliveries/count', body: query });
			expect(query).toMatchObject({ ...recipient, status: 'sent', announcementId: { $exists: true }, $and: [{ $or: [{ eventKey: { $exists: false } }, { eventKey: { $ne: 'conversation.message' } }] }, { $or: [{ title: { $contains: 'Frais 100%_' } }, { body: { $contains: 'Frais 100%_' } }] }] });
		}
	});
	it('pages after server filtering and normalizes dates', async () => {
		const { client, requests } = createRecordingSchoolClient([[{ ...scope, id: 'delivery', title: 'Notice', body: 'Body', status: 'sent', createdAt: new Date('2026-10-27T12:00:00Z') }]]);
		const rows = await fetchInboxDeliveries(client, scope, { search: '', status: 'all', type: 'notification' }, 25);
		expect(requests[0]?.body).toMatchObject({ $offset: 25, $limit: 25, announcementId: { $exists: false } });
		expect(rows[0]?.createdAt).toBe('2026-10-27T12:00:00.000Z');
	});
	it('does not request deliveries with an incomplete selected identity', async () => {
		const { client, requests } = createRecordingSchoolClient([]);
		expect(await fetchInboxDeliveries(client, { ...scope, recipientId: '' })).toEqual([]);
		expect(await fetchInboxDeliveries(client, { ...scope, subjectId: '' })).toEqual([]);
		expect(requests).toEqual([]);
	});
	it('resolves announcement senders through two deduplicated authorized batches', async () => {
		const rows = [
			{ ...scope, id: 'one', announcementId: 'announcement-a', status: 'sent', title: 'One', body: 'Body' },
			{ ...scope, id: 'two', announcementId: 'announcement-a', status: 'sent', title: 'Two', body: 'Body' },
			{ ...scope, id: 'three', announcementId: 'announcement-b', status: 'sent', title: 'Three', body: 'Body' },
		];
		const { client, requests } = createRecordingSchoolClient([rows, [{ id: 'announcement-a', createdBy: 'author' }, { id: 'announcement-b', createdBy: 'author' }], [{ id: 'author', firstName: 'Ada', lastName: 'Teacher' }]]);
		const deliveries = await fetchInboxDeliveries(client, scope);
		expect(deliveries.map(row => row.senderName)).toEqual(['Ada Teacher', 'Ada Teacher', 'Ada Teacher']);
		expect(requests).toHaveLength(3);
		expect(requests[1]).toMatchObject({ path: '/core/entities/announcements/list', body: { id: { $in: ['announcement-a', 'announcement-b'] }, $limit: 2 } });
		expect(requests[2]).toMatchObject({ path: '/core/entities/staff-members/list', body: { id: { $in: ['author'] }, $limit: 1 } });
	});
	it('keeps missing sender metadata explicit and defaults to delivered messages ordered by delivery time', async () => {
		const { client, requests } = createRecordingSchoolClient([[{ ...scope, id: 'one', announcementId: 'missing', status: 'sent', title: 'Notice', body: 'Body' }], []]);
		const deliveries = await fetchInboxDeliveries(client, scope);
		expect(deliveries[0]?.senderState).toBe('unavailable');
		expect(deliveries[0]?.senderName).toBeUndefined();
		expect(requests[0]?.body).toMatchObject({ status: { $in: ['sent', 'read'] }, $orderBy: [{ field: 'sentAt', direction: 'desc' }, { field: 'createdAt', direction: 'desc' }, { field: 'id', direction: 'desc' }] });
	});
});
