import type { ActivitySources } from '$lib/api/activities-data';
import { SEED_SCHOOL_ID } from '@edaya/web-fixtures';
import { describe, expect, it } from 'bun:test';
import { fetchActivityById, fetchActivityOptions, mapActivities } from '$lib/api/activities-data';
import { createRecordingSchoolClient } from '$tests/support/recording-school-client';

const sources: ActivitySources = {
	activitiesRaw: [
		{
			id: 'act-robot',
			schoolId: SEED_SCHOOL_ID,
			name: 'Club Robotique',
			category: 'Science',
			coach: 'M. Adler',
			schedule: 'Mer 14:00 – 16:00',
			participants: 18,
			capacity: 24,
			description: 'Conception et programmation de robots avec Arduino et Lego Mindstorms.',
			startDate: '2025-09-15',
			endDate: '2026-06-12',
			createdAt: '2025-09-01',
		},
	],
	activityEnrollmentsRaw: [
		{
			id: 'ae-act-robot-s1',
			activityId: 'act-robot',
			studentId: 's1',
			status: 'approved',
			createdAt: '2025-09-01',
		},
		{
			id: 'ae-act-robot-s2',
			activityId: 'act-robot',
			studentId: 's2',
			status: 'pending',
			createdAt: '2025-09-01',
		},
	],
	classActivityEnrollmentsRaw: [
		{
			id: 'cae-act-robot-c1',
			activityId: 'act-robot',
			classGroupId: 'c1',
			createdAt: '2025-09-01',
		},
	],
};

describe('activities-data', () => {
	it('reads every timetable activity choice without requesting either membership collection', async () => {
		const labels = Array.from({ length: 501 }, (_, i) => ({ id: String(i), name: `Club ${i}` }));
		const rows = labels.map(label => ({ data: { ...sources.activitiesRaw[0], ...label } }));
		const { client, requests } = createRecordingSchoolClient([rows.slice(0, 500), rows.slice(500)]);
		expect(await fetchActivityOptions(client, SEED_SCHOOL_ID)).toEqual(labels);
		expect(requests.map(row => [row.path, row.body])).toEqual([0, 500].map(offset => [
			'/core/entities/activities/list', { schoolId: SEED_SCHOOL_ID, $limit: 500, $offset: offset },
		]));
	});

	it('maps API activities with enrollments', () => {
		const activities = mapActivities(sources);

		expect(activities).toHaveLength(1);
		expect(activities[0]).toMatchObject({
			id: 'act-robot',
			name: 'Club Robotique',
			category: 'Science',
			participants: 18,
			capacity: 24,
			startDate: '2025-09-15',
		});
		expect(activities[0]?.enrollments).toEqual([
			{ id: 'ae-act-robot-s1', studentId: 's1', status: 'approved' },
			{ id: 'ae-act-robot-s2', studentId: 's2', status: 'pending' },
		]);
		expect(activities[0]?.classEnrollments).toEqual([
			{ id: 'cae-act-robot-c1', classGroupId: 'c1' },
		]);
	});

	it('loads a single activity with enrollments by id', async () => {
		const { client } = createRecordingSchoolClient([
			{ data: sources.activitiesRaw[0] },
			[{ data: sources.activityEnrollmentsRaw[0] }],
			[],
		]);

		const activity = await fetchActivityById(client, 'act-robot');

		expect(activity).toMatchObject({
			id: 'act-robot',
			name: 'Club Robotique',
		});
		expect(activity?.enrollments).toHaveLength(1);
	});

	it('includes both membership collections beyond the first detail page', async () => {
		const pupils = Array.from({ length: 501 }, (_, n) => ({ data: { ...sources.activityEnrollmentsRaw[0]!, id: `pupil-${n}`, studentId: `s-${n}` } }));
		const classes = Array.from({ length: 502 }, (_, n) => ({ data: { ...sources.classActivityEnrollmentsRaw[0]!, id: `class-${n}`, classGroupId: `c-${n}` } }));
		const { client, requests } = createRecordingSchoolClient([
			{ data: sources.activitiesRaw[0] }, pupils.slice(0, 500), classes.slice(0, 500), pupils.slice(500), classes.slice(500),
		]);
		const activity = await fetchActivityById(client, 'act-robot');
		expect(activity?.enrollments.map(row => row.id)).toEqual(pupils.map(row => row.data.id));
		expect(activity?.classEnrollments.map(row => row.id)).toEqual(classes.map(row => row.data.id));
		for (const name of ['activity-enrollments', 'class-activity-enrollments']) {
			expect(requests.filter(request => request.path.endsWith(`/${name}/list`)).map(request => request.body)).toEqual([
				{ activityId: 'act-robot', $limit: 500, $offset: 0 },
				{ activityId: 'act-robot', $limit: 500, $offset: 500 },
			]);
		}
	});
});
