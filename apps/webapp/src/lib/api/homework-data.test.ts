import { subject } from '$lib/test/openapi-fixtures';
import { SEED_SCHOOL_ID } from '@edaya/web-fixtures';
import { describe, expect, it } from 'bun:test';
import { mapDeadlines } from './homework-data';

const classSources = {
	homeworkAssignmentsRaw: [
		{
			id: 'd1',
			schoolId: SEED_SCHOOL_ID,
			classGroupId: '6a',
			classSubjectId: 'cs-6a-math',
			title: 'Algebra exercise sheet #4',
			description: 'Complete exercises 1 to 12.',
			dueDate: '2026-05-18',
			assignedDate: '2026-05-11',
			type: 'homework' as const,
			attachments: [{ name: 'exercises_ch4.pdf', size: '320 KB' }],
		},
	],
	homeworkSubmissionsRaw: [
		{ id: 'hs-d1-s1', homeworkAssignmentId: 'd1', studentId: 's1', status: 'submitted' as const, submittedAt: '2026-05-15' },
		{ id: 'hs-d1-s3', homeworkAssignmentId: 'd1', studentId: 's3', status: 'missing' as const },
	],
	classSubjectsRaw: [
		{ id: 'cs-6a-math', classGroupId: '6a', subjectId: 'subj-math', completedPercentage: 0 },
	],
	subjectsRaw: [
		subject({ id: 'subj-math', name: 'Mathematics', code: 'MATH', defaultCoefficient: 3 }),
	],
};

describe('mapDeadlines', () => {
	it('maps homework assignments with subject labels and submissions', () => {
		const deadlines = mapDeadlines({
			homeworkAssignmentsRaw: [...classSources.homeworkAssignmentsRaw],
			homeworkSubmissionsRaw: [...classSources.homeworkSubmissionsRaw],
			classSubjectsRaw: [...classSources.classSubjectsRaw],
			subjectsRaw: [...classSources.subjectsRaw],
		});

		expect(deadlines).toHaveLength(1);
		expect(deadlines[0]).toMatchObject({
			id: 'd1',
			classId: '6a',
			subject: 'Mathematics',
			type: 'Homework',
			attachments: [{ name: 'exercises_ch4.pdf', size: '320 KB' }],
		});
		expect(deadlines[0]?.submissions).toEqual([
			{ studentId: 's1', status: 'submitted', date: '2026-05-15' },
			{ studentId: 's3', status: 'missing', date: undefined },
		]);
	});

	it('maps every deadline from class-scoped sources', () => {
		const deadlines = mapDeadlines({
			homeworkAssignmentsRaw: [...classSources.homeworkAssignmentsRaw],
			homeworkSubmissionsRaw: [],
			classSubjectsRaw: [...classSources.classSubjectsRaw],
			subjectsRaw: [...classSources.subjectsRaw],
		});

		expect(deadlines.every(deadline => deadline.classId === '6a')).toBe(true);
	});

	it('sorts deadlines by due date', () => {
		const deadlines = mapDeadlines({
			homeworkAssignmentsRaw: [
				{ ...classSources.homeworkAssignmentsRaw[0], id: 'd-late', dueDate: '2026-05-25' },
				{ ...classSources.homeworkAssignmentsRaw[0], id: 'd-early', dueDate: '2026-05-18' },
			],
			homeworkSubmissionsRaw: [],
			classSubjectsRaw: [...classSources.classSubjectsRaw],
			subjectsRaw: [...classSources.subjectsRaw],
		});

		expect(deadlines.map(deadline => deadline.dueDate)).toEqual(['2026-05-18', '2026-05-25']);
	});
});
