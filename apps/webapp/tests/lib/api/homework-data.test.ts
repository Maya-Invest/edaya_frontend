import { mapDeadlines } from '$lib/api/homework-data';
import { classSubject, homeworkAssessment, subject } from '$tests/support/openapi-fixtures';
import { describe, expect, it } from 'bun:test';

const classSources = {
	homeworkAssessmentsRaw: [
		homeworkAssessment({
			id: 'd1',
			classGroupId: '6a',
			classSubjectId: 'cs-6a-math',
			periodId: 'period-1',
			title: 'Algebra exercise sheet #4',
			description: 'Complete exercises 1 to 12.',
			attachments: [{ name: 'exercises_ch4.pdf', size: '320 KB' }],
		}),
	],
	assessmentResultsRaw: [
		{ id: 'ar-d1-s1', revision: 0, assessmentId: 'd1', studentId: 's1', status: 'met' as const, createdAt: '2026-05-15' },
		{ id: 'ar-d1-s3', revision: 0, assessmentId: 'd1', studentId: 's3', status: 'missed' as const },
	],
	classSubjectsRaw: [
		classSubject({ id: 'cs-6a-math', classGroupId: '6a', subjectId: 'subj-math' }),
	],
	subjectsRaw: [
		subject({ id: 'subj-math', name: 'Mathematics', code: 'MATH', defaultCoefficient: 3 }),
	],
};

describe('mapDeadlines', () => {
	it('maps homework assessments with subject labels and submissions', () => {
		const deadlines = mapDeadlines({
			homeworkAssessmentsRaw: [...classSources.homeworkAssessmentsRaw],
			assessmentResultsRaw: [...classSources.assessmentResultsRaw],
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
			homeworkAssessmentsRaw: [...classSources.homeworkAssessmentsRaw],
			assessmentResultsRaw: [],
			classSubjectsRaw: [...classSources.classSubjectsRaw],
			subjectsRaw: [...classSources.subjectsRaw],
		});

		expect(deadlines.every(deadline => deadline.classId === '6a')).toBe(true);
	});

	it('sorts deadlines by due date', () => {
		const deadlines = mapDeadlines({
			homeworkAssessmentsRaw: [
				{ ...classSources.homeworkAssessmentsRaw[0], id: 'd-late', dueAt: '2026-05-25' },
				{ ...classSources.homeworkAssessmentsRaw[0], id: 'd-early', dueAt: '2026-05-18' },
			],
			assessmentResultsRaw: [],
			classSubjectsRaw: [...classSources.classSubjectsRaw],
			subjectsRaw: [...classSources.subjectsRaw],
		});

		expect(deadlines.map(deadline => deadline.dueDate)).toEqual(['2026-05-18', '2026-05-25']);
	});
});
