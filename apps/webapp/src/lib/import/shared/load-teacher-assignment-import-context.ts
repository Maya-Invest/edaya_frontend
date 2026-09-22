import type { getBrowserSchoolClient } from '$lib/api/school-client';
import type {
	TeacherAssignmentImportClassSubjectOption,
	TeacherAssignmentImportTeacherOption,
} from '$lib/import/teacher-assignments/types';
import { listAllEntityPages } from '$lib/api/entity-list-filters';
import { fetchSchoolSubjectsSources } from '$lib/api/subjects-data';
import { formatPersonName } from '$lib/api/teacher-display';

type SchoolClient = ReturnType<typeof getBrowserSchoolClient>;

const TEACHER_LIST_ORDER = [
	{ field: 'lastName', direction: 'asc' as const },
	{ field: 'firstName', direction: 'asc' as const },
];

/**
 * Charge tous les enseignants (code + nom) pour résoudre l’import d’affectations.
 */
export async function loadTeacherAssignmentImportTeachers(
	client: SchoolClient,
	schoolId: string,
): Promise<TeacherAssignmentImportTeacherOption[]> {
	const rows = await listAllEntityPages(
		query => client.entities.teachers.list(query),
		{
			baseQuery: {
				schoolId,
				$orderBy: TEACHER_LIST_ORDER,
			},
		},
	);

	return rows.flatMap((teacher) => {
		const id = typeof teacher.id === 'string' ? teacher.id.trim() : '';
		if (!id) {
			return [];
		}
		const code = typeof teacher.code === 'string' && teacher.code.trim()
			? teacher.code.trim()
			: id;
		return [{
			id,
			code,
			name: formatPersonName(teacher.firstName, teacher.lastName),
		}];
	});
}

/**
 * Charge les matières proposées par classe (classSubject) pour l’import d’affectations.
 */
export async function loadTeacherAssignmentImportClassSubjects(
	client: SchoolClient,
	schoolId: string,
): Promise<TeacherAssignmentImportClassSubjectOption[]> {
	const sources = await fetchSchoolSubjectsSources(client, schoolId);
	return sources.classSubjectsRaw.map(classSubject => ({
		id: classSubject.id,
		classGroupId: classSubject.classGroupId,
		subjectId: classSubject.subjectId,
	}));
}
