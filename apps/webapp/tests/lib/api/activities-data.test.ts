import type { ActivitySources } from '$lib/api/activities-data';
import { SEED_SCHOOL_ID } from '@edaya/web-fixtures';
import { describe, expect, it } from 'bun:test';
import { mapActivities } from '$lib/api/activities-data';

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
};

describe('activities-data', () => {
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
	});
});
