import type { getBrowserSchoolClient } from '$lib/api/school-client';
import type {
	TeacherAssignmentImportClassSubjectOption,
	TeacherAssignmentImportTeacherOption,
} from '$lib/import/teacher-assignments/types';
import { DEFAULT_LIST_PAGE_SIZE, paginatedList } from '$lib/api/entity-list-filters';
import { fetchSchoolSubjectsSources } from '$lib/api/subjects-data';
import { formatPersonName } from '$lib/api/teacher-display';

type SchoolClient = ReturnType<typeof getBrowserSchoolClient>;

const PAGE = DEFAULT_LIST_PAGE_SIZE;
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
	const out: TeacherAssignmentImportTeacherOption[] = [];
	let offset = 0;

	for (;;) {
		const page = await client.entities.teachers.list(
			paginatedList({ schoolId }, {
				limit: PAGE,
				offset,
				orderBy: TEACHER_LIST_ORDER,
			}),
		);
		const rows = page ?? [];
		for (const teacher of rows) {
			// API Teacher has no separate `code`; import keys resolve against entity id.
			const code = typeof teacher.id === 'string' ? teacher.id.trim() : '';
			if (!code)
				continue;
			out.push({
				id: teacher.id,
				code,
				name: formatPersonName(teacher.firstName, teacher.lastName),
			});
		}
		if (rows.length < PAGE)
			break;
		offset += PAGE;
	}

	return out;
}

/**
 * Charge les matières proposées par classe (classSubject) pour l’import d’affectations.
 */
export async function loadTeacherAssignmentImportClassSubjects(
	client: SchoolClient,
): Promise<TeacherAssignmentImportClassSubjectOption[]> {
	const sources = await fetchSchoolSubjectsSources(client);
	return sources.classSubjectsRaw.map(classSubject => ({
		id: classSubject.id,
		classGroupId: classSubject.classGroupId,
		subjectId: classSubject.subjectId,
	}));
}
