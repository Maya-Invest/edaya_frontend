import { deliveryRecipientName, fetchAnnouncementPeople, fetchAnnouncements } from '$lib/api/announcements-data';
import { createRecordingSchoolClient } from '$tests/support/recording-school-client';
import { expect, it } from 'bun:test';

it('reads only announcements and their targets to show the announcement list', async () => {
	const { client, requests } = createRecordingSchoolClient([[{ id: 'a', title: 'Notice', content: '', createdAt: '2026-11-18' }], []]);
	const items = await fetchAnnouncements(client, 'school');
	expect(items.map(row => row.id)).toEqual(['a']);
	expect(requests.map(r => r.path)).toEqual(['/core/entities/announcements/list', '/core/entities/announcement-targets/list']);
});

it('loads only required recipient kinds and resolves an ID separately for each kind', async () => {
	const { client, requests } = createRecordingSchoolClient([
		[{ data: { id: 'same', firstName: 'Guardian', lastName: 'One' } }],
		[{ data: { id: 'same', firstName: 'Student', lastName: 'Two' } }],
	]);
	const signal = new AbortController().signal;
	const people = await fetchAnnouncementPeople(client, 'school', 'year', [
		{ kind: 'class_group', id: 'class' }, { kind: 'school' }, { kind: 'guardian', id: 'same' },
		{ kind: 'student', id: 'same' }, { kind: 'guardian', id: 'same' },
	], signal);
	expect(requests.map(r => r.path)).toEqual(['/core/entities/guardians/list', '/core/entities/students/list']);
	for (const request of requests) expect(request.body).toMatchObject({ schoolId: 'school', id: { $in: ['same'] } });
	expect(deliveryRecipientName({ kind: 'student', id: 'same' }, people)).toBe('Student Two');
	expect(deliveryRecipientName({ kind: 'guardian', id: 'same' }, people)).toBe('Guardian One');
	expect(deliveryRecipientName({ id: 'same' }, people)).toBe('Guardian One');
	expect(deliveryRecipientName({ kind: 'staff', id: 'same' }, people)).toBeUndefined();
});

it('skips catalogs for broadcast targets and honors cancellation before a person batch', async () => {
	const { client, requests } = createRecordingSchoolClient([]);
	const controller = new AbortController();
	await fetchAnnouncementPeople(client, 'school', 'year', [{ kind: 'all_students' }, { kind: 'grade_level', id: 'level' }], controller.signal);
	controller.abort();
	await expect(fetchAnnouncementPeople(client, 'school', 'year', [{ kind: 'student', id: 'p' }], controller.signal)).rejects.toThrow();
	expect(requests).toHaveLength(0);
});
