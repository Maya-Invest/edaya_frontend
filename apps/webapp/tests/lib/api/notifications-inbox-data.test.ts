import { fetchInboxDeliveries } from '$lib/api/notifications-inbox-data';
import { createRecordingSchoolClient } from '$tests/support/recording-school-client';
import { describe, expect, it } from 'bun:test';

describe('personal inbox recipient filtering', () => {
	it('constrains each query to both the login and selected profile, including owners', async () => {
		const { client, requests } = createRecordingSchoolClient([[], [], []]);
		for (const recipient of [
			{ subjectId: 'person', recipientKind: 'staff' as const, recipientId: 'staff-owner' },
			{ subjectId: 'person', recipientKind: 'guardian' as const, recipientId: 'guardian' },
			{ subjectId: 'person', recipientKind: 'teacher' as const, recipientId: 'teacher' },
		]) {
			expect(await fetchInboxDeliveries(client, recipient)).toEqual([]);
			expect(requests.at(-1)).toEqual({ method: 'POST', path: '/core/entities/message-deliveries/list', body: recipient });
		}
	});

	it('does not issue an unbounded request when the selected identity is incomplete', async () => {
		const { client, requests } = createRecordingSchoolClient([]);
		expect(await fetchInboxDeliveries(client, { subjectId: 'person', recipientKind: 'staff', recipientId: '' })).toEqual([]);
		expect(await fetchInboxDeliveries(client, { subjectId: '', recipientKind: 'staff', recipientId: 'staff' })).toEqual([]);
		expect(requests).toEqual([]);
	});
});
