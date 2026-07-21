import type { getBrowserSchoolClient } from '$lib/api/school-client';
import type { TeacherImportClassSubjectOption } from '$lib/import/teachers/types';
import { fetchSchoolSubjectsSources } from '$lib/api/subjects-data';

type SchoolClient = ReturnType<typeof getBrowserSchoolClient>;

export async function loadTeacherImportClassSubjects(
	client: SchoolClient,
): Promise<TeacherImportClassSubjectOption[]> {
	const sources = await fetchSchoolSubjectsSources(client);
	return sources.classSubjectsRaw.map(classSubject => ({
		id: classSubject.id,
		classGroupId: classSubject.classGroupId,
		subjectId: classSubject.subjectId,
	}));
}
