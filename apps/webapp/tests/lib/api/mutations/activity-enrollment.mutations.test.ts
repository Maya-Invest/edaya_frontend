import type { Activity, ActivityEnrollment } from '$lib/types/school';
import { describe, expect, it } from 'bun:test';

function patchActivityEnrollments(
	activities: Activity[],
	activityId: string,
	enrollments: ActivityEnrollment[],
): Activity[] {
	return activities.map(activity =>
		activity.id === activityId ? { ...activity, enrollments } : activity);
}

describe('activity enrollment store actions', () => {
	it('replaces enrollments for the targeted activity only', () => {
		const activities: Activity[] = [{
			id: 'act-1',
			name: 'Chess club',
			category: 'Wellbeing',
			coach: 'Coach',
			schedule: '—',
			participants: 0,
			capacity: 20,
			description: '',
			startDate: '2025-09-01',
			endDate: '2026-06-01',
			enrollments: [],
		}, {
			id: 'act-2',
			name: 'Theatre',
			category: 'Arts',
			coach: 'Coach',
			schedule: '—',
			participants: 0,
			capacity: 20,
			description: '',
			startDate: '2025-09-01',
			endDate: '2026-06-01',
			enrollments: [{ id: 'ae-2', studentId: 's2', status: 'approved' }],
		}];

		const next = patchActivityEnrollments(activities, 'act-1', [
			{ id: 'ae-1', studentId: 's1', status: 'pending' },
		]);

		expect(next[0]?.enrollments).toEqual([{ id: 'ae-1', studentId: 's1', status: 'pending' }]);
		expect(next[1]?.enrollments).toEqual([{ id: 'ae-2', studentId: 's2', status: 'approved' }]);
	});

	it('removes a single enrollment without touching siblings', () => {
		const activities: Activity[] = [{
			id: 'act-1',
			name: 'Chess club',
			category: 'Wellbeing',
			coach: 'Coach',
			schedule: '—',
			participants: 0,
			capacity: 20,
			description: '',
			startDate: '2025-09-01',
			endDate: '2026-06-01',
			enrollments: [
				{ id: 'ae-1', studentId: 's1', status: 'pending' },
				{ id: 'ae-2', studentId: 's2', status: 'approved' },
			],
		}];

		const next = patchActivityEnrollments(activities, 'act-1', [
			{ id: 'ae-2', studentId: 's2', status: 'approved' },
		]);

		expect(next[0]?.enrollments).toHaveLength(1);
		expect(next[0]?.enrollments[0]?.studentId).toBe('s2');
	});
});
