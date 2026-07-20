import type { Student } from '$lib/types/school';
import { normalizeStudentMatricule } from '$lib/import/shared/normalize-student-matricule';

export function studentMatchesSearchQuery(student: Student, query: string): boolean {
	const needle = query.trim().toLowerCase();
	if (!needle) {
		return true;
	}

	const haystack = `${student.name} ${student.email}`.toLowerCase();
	if (haystack.includes(needle)) {
		return true;
	}

	const matricule = student.matricule?.trim();
	if (!matricule) {
		return false;
	}

	return normalizeStudentMatricule(matricule).includes(normalizeStudentMatricule(needle));
}
