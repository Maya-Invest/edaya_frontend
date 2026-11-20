import { describe, expect, test } from 'bun:test';
import { pendingStudentPhotoFor } from '../../../../../src/routes/(app)/school/students/lib/student-detail-host';
import type { StudentPhotoSubmission } from '../../../../../src/routes/(app)/school/students/lib/student-detail-host';

function submission(
	studentId: string,
	status: StudentPhotoSubmission['status'],
): StudentPhotoSubmission {
	return {
		id: `${studentId}-${status}`,
		studentId,
		status,
	} as StudentPhotoSubmission;
}

describe('pendingStudentPhotoFor', () => {
	test('returns only pending submissions for the student', () => {
		const pending = submission('stu-1', 'pending');
		const approved = submission('stu-1', 'approved');
		const other = submission('stu-2', 'pending');

		expect(pendingStudentPhotoFor([approved, pending, other], 'stu-1')).toEqual(pending);
		expect(pendingStudentPhotoFor([approved, other], 'stu-1')).toBeUndefined();
	});
});
