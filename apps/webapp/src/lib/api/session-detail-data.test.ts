import type { Student } from '$lib/types/school';
import { buildSessionDetail, buildSessionSubjectMatters } from '$lib/api/session-detail-data';
import { staffMember, subject } from '$lib/test/openapi-fixtures';
import { SEED_SCHOOL_ID } from '@edaya/web-fixtures';
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
	it('joins session attendance and logbook for class students', () => {
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

		const detail = buildSessionDetail({
			session: {
				id: 'sess-att-today-6a',
				classGroupId: '6a',
				classSubjectId: 'cs-6a-math',
				title: 'Math',
				kind: 'course',
				startsAt: '2026-05-22T08:00:00.000Z',
				endsAt: '2026-05-22T09:00:00.000Z',
			},
			students,
			attendanceRaw: [{
				id: 'att-1',
				studentId: 'stu-1',
				sessionId: 'sess-att-today-6a',
				status: 'present',
				date: '2026-05-22',
				justificationStatus: 'none',
			}],
			logSources: {
				classLogbookEntriesRaw: [{
					id: 'log-1',
					schoolId: SEED_SCHOOL_ID,
					classGroupId: '6a',
					classSubjectId: 'cs-6a-math',
					date: '2026-05-22',
					chapter: 'Fractions',
					content: 'Lesson content',
					objectives: ['Add fractions'],
					homework: 'Ex. 1-5',
					attachments: [],
					progress: 40,
				}],
				classSubjectsRaw: [{ id: 'cs-6a-math', classGroupId: '6a', subjectId: 'subj-math', completedPercentage: 0 }],
				subjectsRaw: [subject({ id: 'subj-math', name: 'Mathematics', code: 'MATH', defaultCoefficient: 3 })],
				staffMembersRaw: [staffMember({ id: 'st1', firstName: 'Marie', lastName: 'Dupont', email: 'm@school.edu' })],
				staffAssignmentsRaw: [],
			},
			classSubjectMattersRaw,
			subjectMattersRaw,
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
			id: 'log-1',
			chapter: 'Fractions',
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
