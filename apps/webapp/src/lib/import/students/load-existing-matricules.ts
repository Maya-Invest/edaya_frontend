import { schoolWideEntityList } from '$lib/api/entity-list-filters';
import { getBrowserSchoolClient } from '$lib/api/school-client';

const STUDENT_IMPORT_MATRICULE_SCOPE
	= 'Student import validation loads existing matricules for duplicate detection.';

function normalizeMatricule(value: string): string {
	return value.trim().toLowerCase();
}

export async function loadExistingStudentMatricules(): Promise<Set<string>> {
	const client = getBrowserSchoolClient();
	const students = await client.entities.students.list(
		schoolWideEntityList(STUDENT_IMPORT_MATRICULE_SCOPE),
	);
	const matricules = new Set<string>();

	for (const student of students ?? []) {
		const matricule = typeof student.matricule === 'string' ? student.matricule.trim() : '';
		if (matricule) {
			matricules.add(normalizeMatricule(matricule));
		}
	}

	return matricules;
}
