import type { components } from '$lib/api/schema';
import type { Student } from '$lib/types/school';
import { safeOptionalEntityList } from '$lib/api/safe-entity-access';
import { getBrowserSchoolClient } from '$lib/api/school-client';

export type StudentPhotoSubmission = components['schemas']['StudentPhotoSubmission'];

/** Shared roster API used by school and class student drawers. */
export interface StudentDetailHost {
	findStudent: (id: string) => Student | undefined;
	patchStudent: (id: string, patch: Partial<Student>) => void;
	pendingPhotoSubmissions: StudentPhotoSubmission[];
	pendingPhotoFor: (studentId: string) => StudentPhotoSubmission | undefined;
	loadPendingPhotoReviews: () => Promise<void>;
}

export async function loadPendingStudentPhotoReviews(): Promise<StudentPhotoSubmission[]> {
	return safeOptionalEntityList(() =>
		getBrowserSchoolClient().entities.studentPhotoSubmissions.list({
			status: 'pending',
			$limit: 200,
		}),
	);
}

export function pendingStudentPhotoFor(
	submissions: readonly StudentPhotoSubmission[],
	studentId: string,
): StudentPhotoSubmission | undefined {
	return submissions.find(
		submission => submission.studentId === studentId && submission.status === 'pending',
	);
}
