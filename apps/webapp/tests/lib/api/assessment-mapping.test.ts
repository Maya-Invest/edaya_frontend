import { homeworkAssessment } from '$tests/support/openapi-fixtures';
import { describe, expect, it } from 'bun:test';
import { mapAssessmentToEvaluation } from '$lib/api/assessment-mapping';

describe('mapAssessmentToEvaluation', () => {
	it('preserves assessment kind and homework submission stats', () => {
		const evaluation = mapAssessmentToEvaluation(
			homeworkAssessment({
				id: 'hw-1',
				classGroupId: '6a',
				classSubjectId: 'cs-6a-math',
				periodId: 'p1',
				title: 'Chapter 5',
				dueAt: '2026-05-20',
			}),
			{
				subjectName: 'Mathematics',
				classSize: 2,
				results: [
					{
						id: 'ar-1',
						studentId: 's1',
						assessmentId: 'hw-1',
						status: 'met',
						createdAt: '2026-05-18',
					},
					{
						id: 'ar-2',
						studentId: 's2',
						assessmentId: 'hw-1',
						status: 'missed',
					},
				],
			},
		);

		expect(evaluation).toMatchObject({
			id: 'hw-1',
			kind: 'homework',
			subject: 'Mathematics',
			dueDate: '2026-05-20',
			submittedCount: 1,
			total: 2,
		});
		expect(evaluation.submissions).toEqual([
			{ studentId: 's1', status: 'submitted', date: '2026-05-18' },
			{ studentId: 's2', status: 'missing' },
		]);
	});
});
