import type { MarksReview } from '../../../src/routes/(app)/classes/[classId]/evaluations/lib/grading-task';
export function marksReview(): MarksReview {
	return {
		assessment: { id: 'assessment', classGroupId: 'class', classSubjectId: 'subject', periodId: 'period', title: 'Algebra', kind: 'quiz', maxScore: 20, coefficient: 1, attachments: [], marksStatus: 'draft', marksRevision: 3, marksReview: { rosterStudentIds: ['s1', 's2'], markEditorSubjectIds: {}, editedBySubjectIds: [], history: [] } },
		gradingPolicy: { academicYearId: 'year', revision: 2, mode: 'numeric-first', aggregateLabel: 'Average', status: 'completed', numericEquivalents: {}, scale: { id: 'scale', schoolId: 'school', name: 'Scale', minScore: 0, maxScore: 20, decimalPlaces: 2, roundingMode: 'nearest', intervalConvention: 'continuous', revision: 1, isDefault: true, ranges: [{ id: 'pass', letter: 'A', minScore: 10, maxScore: 20, gpaValue: 4 }] } },
		students: [{ id: 's1', firstName: 'Alexandra', lastName: 'Long student name' }, { id: 's2', firstName: 'Nadia', lastName: 'Kone' }],
		results: [{ id: 'existing-id', assessmentId: 'assessment', studentId: 's1', revision: 1, score: 10, designation: 'scored', originalEntry: { kind: 'numeric', value: 10, maximum: 20 }, status: 'late', notes: 'Retain compliance' }],
		missingStudentIds: ['s2'], publishedResultIds: [], corrections: [], allowedActions: { submit: false, requestCorrection: false },
	};
}
