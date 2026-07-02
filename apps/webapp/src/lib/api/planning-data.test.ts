import type { components } from '$lib/api/schema';
import type { PlanningSources } from './planning-data';
import { describe, expect, test } from 'bun:test';
import { mapPlanningEvents } from './planning-data';

type ActivityRaw = components['schemas']['Activity'];
type ClassSubjectRaw = components['schemas']['ClassSubject'];
type SubjectRaw = components['schemas']['Subject'];

function emptySources(overrides: Partial<PlanningSources> = {}): PlanningSources {
	return {
		timetableEventsRaw: [],
		lessonSessionsById: new Map(),
		activitySessionsById: new Map(),
		activitiesById: new Map(),
		classSubjectsRaw: [],
		subjectsRaw: [],
		staffMembersRaw: [],
		staffAssignmentsRaw: [],
		resourcesRaw: [],
		resourceAssignmentsRaw: [],
		...overrides,
	};
}

describe('mapPlanningEvents', () => {
	test('maps lesson, activity, and assessment timetable rows', () => {
		const sources = emptySources({
			timetableEventsRaw: [
				{
					kind: 'lesson',
					id: 'ls-1',
					classGroupId: 'cg-1',
					classSubjectId: 'cs-math',
					title: 'Fractions',
					startsAt: '2026-06-02T08:00:00.000Z',
					endsAt: '2026-06-02T09:00:00.000Z',
					lessonSessionId: 'ls-1',
					status: 'pending',
				},
				{
					kind: 'activity',
					id: 'as-1',
					classGroupId: 'cg-1',
					activityId: 'act-football',
					title: 'Football',
					startsAt: '2026-06-02T15:00:00.000Z',
					endsAt: '2026-06-02T16:00:00.000Z',
					activitySessionId: 'as-1',
					status: 'pending',
				},
				{
					kind: 'assessment',
					id: 'exam-1',
					classGroupId: 'cg-1',
					classSubjectId: 'cs-math',
					title: 'Quiz',
					startsAt: '2026-06-03T10:00:00.000Z',
					endsAt: '2026-06-03T11:00:00.000Z',
					assessmentId: 'exam-1',
				},
			],
			lessonSessionsById: new Map([['ls-1', {
				id: 'ls-1',
				schoolId: 'school-1',
				classGroupId: 'cg-1',
				scheduleId: 'sched-1',
				classSubjectId: 'cs-math',
				displayLabel: 'Fractions',
				startsAt: '2026-06-02T08:00:00.000Z',
				endsAt: '2026-06-02T09:00:00.000Z',
				status: 'pending',
				isException: false,
			}]]),
			activitySessionsById: new Map([['as-1', {
				id: 'as-1',
				schoolId: 'school-1',
				classGroupId: 'cg-1',
				scheduleId: 'sched-act',
				activityId: 'act-football',
				displayLabel: 'Football',
				startsAt: '2026-06-02T15:00:00.000Z',
				endsAt: '2026-06-02T16:00:00.000Z',
				status: 'pending',
				isException: false,
			}]]),
			activitiesById: new Map<string, ActivityRaw>([['act-football', {
				id: 'act-football',
				schoolId: 'school-1',
				name: 'Football',
				category: 'Sport',
				coach: 'Coach Dupont',
				schedule: '',
				participants: 0,
				capacity: 20,
				description: 'Training',
				startDate: null,
				endDate: null,
			}]]),
			classSubjectsRaw: [{
				id: 'cs-math',
				classGroupId: 'cg-1',
				subjectId: 'subj-math',
				completedPercentage: null,
				isOffered: true,
			} satisfies ClassSubjectRaw],
			subjectsRaw: [{
				id: 'subj-math',
				schoolId: 'school-1',
				name: 'Mathematics',
				category: 'Scientifique',
				color: 'mint',
			} satisfies SubjectRaw],
		});

		const events = mapPlanningEvents('cg-1', sources);
		expect(events.map(event => event.kind)).toEqual(['lesson', 'activity', 'assessment']);
		expect(events[0]?.id).toBe('ls-1');
		expect(events[1]?.teacher).toBe('Coach Dupont');
		expect(events[2]?.subject).toBe('Mathematics');
	});
});
