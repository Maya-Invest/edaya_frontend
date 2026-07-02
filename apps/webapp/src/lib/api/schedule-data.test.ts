import { describe, expect, test } from 'bun:test';
import { mapTimetableSchedules } from './schedule-data';

describe('mapTimetableSchedules', () => {
	test('maps activity schedules with activity name as subject label', () => {
		const schedules = mapTimetableSchedules(
			'cg-1',
			[{
				id: 'sched-act',
				schoolId: 'school-1',
				classGroupId: 'cg-1',
				scheduleKind: 'activity',
				activityId: 'act-football',
				title: 'Sport du mercredi',
				isRecurring: true,
				dayOfWeek: 'wednesday',
				startTime: '15:00',
				endTime: '16:00',
				classSubjectId: null,
				specificDate: null,
			}],
			[],
			[],
			[{
				id: 'act-football',
				schoolId: 'school-1',
				name: 'Football',
				category: 'Sport',
				coach: 'Coach Dupont',
				schedule: 'Wed 15:00',
				participants: 12,
				capacity: 20,
				description: 'Training',
				startDate: null,
				endDate: null,
			}],
		);

		expect(schedules).toHaveLength(1);
		expect(schedules[0]?.scheduleKind).toBe('activity');
		expect(schedules[0]?.activityId).toBe('act-football');
		expect(schedules[0]?.subject).toBe('Football');
	});
});
