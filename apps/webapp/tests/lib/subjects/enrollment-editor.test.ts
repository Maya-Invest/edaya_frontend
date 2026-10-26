import type { EnrollmentEditorContext, ParticipationData } from '../../../src/lib/subjects/enrollment-editor';
import type { Enrollment } from '../../../src/lib/subjects/subject-selection';
import { describe, expect, it } from 'bun:test';
import { editorCommonSelection, editorOperations, enrollmentSelectionClass, preserveCompletedPeriods } from '../../../src/lib/subjects/enrollment-editor';

const context: EnrollmentEditorContext = { schoolId: 'school', academicYearId: 'year', classGroupId: 'class', className: 'Class', yearName: 'Year', zone: 'UTC', students: [{ id: 'a', name: 'A' }, { id: 'b', name: 'B' }] };
const now = '2026-10-25T12:00:00Z';
const periods = [{ id: 'past', academicYearId: 'year', name: 'Past', startDate: '2026-01-01', endDate: '2026-02-01' }, { id: 'future', academicYearId: 'year', name: 'Future', startDate: '2027-01-01', endDate: '2027-06-01' }] as ParticipationData['periods'];
function student(id: string, enrollments: Enrollment[] = []): ParticipationData {
	return { studentId: id, placements: [{ id: `p-${id}`, classGroupId: 'class', academicYearId: 'year', status: 'active' }], enrollments, periods, offerings: [] } as unknown as ParticipationData;
}
function enrollment(studentId: string, subjectId: string, scope: 'annual' | 'periods' = 'annual'): Enrollment {
	return { id: `e-${studentId}-${subjectId}`, studentClassEnrollmentId: `p-${studentId}`, classSubjectId: subjectId, scope, periods: scope === 'periods' ? [{ periodId: 'past' }] : [] } as unknown as Enrollment;
}
describe('subject enrolment editor payloads', () => {
	it('requires every selected row to resolve with a placement in the same class', () => {
		const rows = [{ id: 'a', classId: 'class', enrollmentId: 'pa' }, { id: 'b', classId: 'other', enrollmentId: 'pb' }];
		expect(enrollmentSelectionClass(rows, ['a'])).toBe('class');
		for (const ids of [[], ['missing'], ['a', 'missing'], ['a', 'b']])
			expect(enrollmentSelectionClass(rows, ids)).toBeNull();
		expect(enrollmentSelectionClass([{ ...rows[0]!, enrollmentId: undefined }], ['a'])).toBeNull();
	});
	it('computes mixed values for the requested subject only', () => {
		const data = [student('a', [enrollment('a', 'music'), enrollment('a', 'art')]), student('b', [enrollment('b', 'art')])];
		expect(editorCommonSelection(data, context, ['a', 'b'], 'music', now)).toBeNull();
		expect(editorCommonSelection(data, context, ['a', 'b'], 'art', now)).toEqual({ scope: 'annual' });
	});
	it('omits untouched subjects, no-ops and mixed choices without an explicit replacement', () => {
		const data = [student('a', [enrollment('a', 'music')]), student('b')];
		expect(editorOperations(data, context, ['a', 'b'], {
			music: { enabled: true, explicit: true, selection: { scope: 'annual' } },
			art: { enabled: false, explicit: true, selection: { scope: 'annual' } },
			latin: { enabled: true, explicit: false, selection: { scope: 'none' } },
		}, now, '2026-10-25')).toEqual([{ studentClassEnrollmentId: 'p-b', classSubjectId: 'music', selection: { scope: 'annual' } }]);
	});
	it('keeps each recipient’s completed periods without assigning them to other recipients', () => {
		const data = [student('a', [enrollment('a', 'music', 'periods')]), student('b')];
		const operations = editorOperations(data, context, ['a', 'b'], { music: { enabled: true, explicit: true, selection: { scope: 'periods', periodIds: ['past', 'future'] } } }, now, '2026-10-25');
		expect(operations.map(row => row.selection)).toEqual([{ scope: 'periods', periodIds: ['future', 'past'] }, { scope: 'periods', periodIds: ['future'] }]);
		expect(preserveCompletedPeriods({ scope: 'none' }, data[0]!.enrollments[0], periods, '2026-10-25')).toEqual({ scope: 'none' });
	});
	it('rejects the complete payload if any recipient has no valid placement', () => {
		const b = student('b'); b.placements[0]!.endedAt = '2026-10-24T00:00:00Z';
		expect(() => editorOperations([student('a'), b], context, ['a', 'b'], { music: { enabled: true, explicit: true, selection: { scope: 'annual' } } }, now, '2026-10-25')).toThrow('participation.invalidPlacement');
	});
});
