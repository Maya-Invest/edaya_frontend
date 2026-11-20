import type { Student } from '$lib/types/school';
import { buildSessionDetail, buildSessionSubjectMatters, loadPlanningOccurrenceDetail } from '$lib/api/session-detail-data';
import { lessonSession } from '$tests/support/openapi-fixtures';
import { describe, expect, it } from 'bun:test';

const students: Student[] = [{
	id: 'stu-1',
	classId: '6a',
	name: 'Alice Martin',
	initials: 'AM',
	email: 'alice@school.edu',
	birthdate: '2012-01-01',
	guardian: 'Parent',
	attendance: 95,
	average: 14,
	status: 'active',
}];

describe('buildSessionDetail', () => {
	it('joins lesson session attendance, progress, and session note', () => {
		const classSubjectMattersRaw = [{
			id: 'csm-cs-6a-math',
			classSubjectId: 'cs-6a-math',
			subjectMatterId: 'sm-math',
			status: 'in_progress' as const,
			completedPercentage: 40,
		}];
		const subjectMattersRaw = [{
			id: 'sm-math',
			subjectId: 'subj-math',
			name: 'Core programme',
			description: 'Algebra fundamentals',
			sequenceOrder: 1,
			estimatedHours: 5,
		}];
		const progressRaw = [{
			id: 'csp-1',
			classSubjectMatterId: 'csm-cs-6a-math',
			lessonSessionId: 'ls-att-today-6a',
			completed: false,
			notes: 'Add fractions',
		}];

		const detail = buildSessionDetail({
			session: lessonSession({
				id: 'ls-att-today-6a',
				classGroupId: '6a',
				classSubjectId: 'cs-6a-math',
				scheduleId: 'sched-1',
				displayLabel: 'Math',
				sessionNote: 'Lesson content',
			}),
			students,
			attendanceRaw: [{
				id: 'att-1',
				studentId: 'stu-1',
				lessonSessionId: 'ls-att-today-6a',
				status: 'present',
				date: '2026-05-22',
				justificationStatus: 'none',
			}],
			classSubjectMattersRaw,
			subjectMattersRaw,
			progressRaw,
		});

		expect(detail.attendance).toHaveLength(1);
		expect(detail.attendance[0]).toMatchObject({
			studentId: 'stu-1',
			status: 'present',
		});
		expect(detail.subjectMatters).toEqual([{
			id: 'csm-cs-6a-math',
			name: 'Core programme',
			sequenceOrder: 1,
			status: 'in_progress',
			completedPercentage: 40,
		}]);
		expect(detail.logbook).toMatchObject({
			id: 'ls-att-today-6a',
			content: 'Lesson content',
		});
	});

	it('sorts subject matters by sequence order', () => {
		const matters = buildSessionSubjectMatters(
			[
				{ id: 'csm-2', classSubjectId: 'cs-1', subjectMatterId: 'sm-2', status: 'not_started', completedPercentage: 0 },
				{ id: 'csm-1', classSubjectId: 'cs-1', subjectMatterId: 'sm-1', status: 'in_progress', completedPercentage: 25 },
			],
			[
				{ id: 'sm-2', subjectId: 'subj-1', name: 'Geometry', sequenceOrder: 2 },
				{ id: 'sm-1', subjectId: 'subj-1', name: 'Fractions', sequenceOrder: 1 },
			],
		);

		expect(matters.map(entry => entry.name)).toEqual(['Fractions', 'Geometry']);
	});
});

it('occurrence reads distinguish missing records from denied and failed requests', async () => {
	const { ApiError } = await import('@maya-invest/edaya-api-client');
	for (const kind of ['lesson', 'activity', 'assessment'] as const) {
		for (const code of [403, 404, 503]) {
			const error = new ApiError(code, {});
			const entity = { get: async () => { throw error; } };
			const client = { entities: { lessonSessions: entity, activitySessions: entity, assessments: entity } } as unknown as Parameters<typeof loadPlanningOccurrenceDetail>[0];
			const result = loadPlanningOccurrenceDetail(client, { id: 'missing', kind });
			if (code === 404)
				expect(await result).toBeNull();
			else await expect(result).rejects.toBe(error);
		}
	}
});
