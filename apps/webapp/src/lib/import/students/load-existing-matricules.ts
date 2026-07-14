import { loadStudentMatriculeIndex } from '$lib/import/shared/load-student-matricule-index';

export async function loadExistingStudentMatricules(): Promise<Set<string>> {
	const index = await loadStudentMatriculeIndex();
	return new Set(index.keys());
}
