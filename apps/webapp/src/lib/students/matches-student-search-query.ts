import type { Student } from '$lib/types/school';
import { normalizeStudentMatricule } from '$lib/import/shared/normalize-student-identifier';

export function studentMatchesSearchQuery(student: Student, query: string): boolean {
	const needle = query.trim().toLowerCase();
	if (!needle) {
		return true;
	}

	const haystack = `${student.name} ${student.email}`.toLowerCase();
	if (haystack.includes(needle)) {
		return true;
	}

	const identifier = student.identifier?.trim();
	if (!identifier) {
		return false;
	}

	return normalizeStudentMatricule(identifier).includes(normalizeStudentMatricule(needle));
}
