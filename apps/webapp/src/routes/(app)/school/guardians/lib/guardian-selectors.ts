import type { Guardian, Student } from '$lib/types/school';

export function guardianDetailIdFromUrl(url: URL): string | undefined {
	const match = url.pathname.match(/\/school\/guardians\/([^/]+)/);
	return match?.[1];
}

export function linkedStudentsForGuardian(
	students: readonly Student[],
	guardian: Guardian,
): Student[] {
	return guardian.studentIds
		.map(studentId => students.find(student => student.id === studentId))
		.filter((student): student is Student => Boolean(student));
}
