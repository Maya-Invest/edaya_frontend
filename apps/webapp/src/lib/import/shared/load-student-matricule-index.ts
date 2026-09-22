import { listAllEntityPages, schoolWideEntityList } from '$lib/api/entity-list-filters';
import { getBrowserSchoolClient } from '$lib/api/school-client';
import { normalizeStudentMatricule } from '$lib/import/shared/normalize-student-matricule';

const STUDENT_MATRICULE_INDEX_SCOPE
	= 'Import validation loads student matricules for guardian linking and duplicate detection.';

export interface StudentMatriculeEntry {
	studentId: string;
	matricule: string;
}

export { normalizeStudentMatricule };

export async function loadStudentMatriculeIndex(): Promise<Map<string, StudentMatriculeEntry>> {
	const client = getBrowserSchoolClient();
	const students = await listAllEntityPages(
		query => client.entities.students.list(query),
		{ baseQuery: schoolWideEntityList(STUDENT_MATRICULE_INDEX_SCOPE) },
	);
	const index = new Map<string, StudentMatriculeEntry>();

	for (const student of students) {
		const matricule = typeof student.matricule === 'string' ? student.matricule.trim() : '';
		const studentId = typeof student.id === 'string' ? student.id.trim() : '';
		if (!matricule || !studentId) {
			continue;
		}
		index.set(normalizeStudentMatricule(matricule), {
			studentId,
			matricule,
		});
	}

	return index;
}
