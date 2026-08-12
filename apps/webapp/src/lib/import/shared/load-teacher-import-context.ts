import type { getBrowserSchoolClient } from '$lib/api/school-client';
import { fetchSchoolSubjectsSources } from '$lib/api/subjects-data';

type SchoolClient = ReturnType<typeof getBrowserSchoolClient>;

export interface TeacherImportClassSubjectOption {
	id: string;
	classGroupId: string;
	subjectId: string;
}

/** @deprecated Prefer loadTeacherAssignmentImportClassSubjects for the assignments import pack. */
export async function loadTeacherImportClassSubjects(
	client: SchoolClient,
	schoolId: string,
): Promise<TeacherImportClassSubjectOption[]> {
	const sources = await fetchSchoolSubjectsSources(client, schoolId);
	return sources.classSubjectsRaw.map(classSubject => ({
		id: classSubject.id,
		classGroupId: classSubject.classGroupId,
		subjectId: classSubject.subjectId,
	}));
}
