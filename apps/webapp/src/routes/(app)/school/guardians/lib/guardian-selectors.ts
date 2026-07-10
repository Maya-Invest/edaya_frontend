import type { GuardianListFilters } from '$lib/list/list-url-filters';
import type { Guardian, Student } from '$lib/types/school';

export function guardianDetailIdFromUrl(url: URL): string | undefined {
	const match = url.pathname.match(/\/school\/guardians\/([^/]+)/);
	return match?.[1];
}

export function filterGuardianList(
	guardians: readonly Guardian[],
	filters: GuardianListFilters,
): Guardian[] {
	const query = filters.q.trim().toLowerCase();
	if (!query) {
		return [...guardians];
	}
	return guardians.filter(guardian => guardian.name.toLowerCase().includes(query));
}

export function linkedStudentsForGuardian(
	students: readonly Student[],
	guardian: Guardian,
): Student[] {
	return guardian.studentIds
		.map(studentId => students.find(student => student.id === studentId))
		.filter((student): student is Student => Boolean(student));
}
