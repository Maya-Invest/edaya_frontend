import type { StudentListFilters } from '$lib/list/list-url-filters';
import type { Student } from '$lib/types/school';

export function studentListUsesFullRoster(filters: Pick<StudentListFilters, 'q' | 'status'>) {
	return filters.q.trim() !== '' || filters.status !== 'all';
}

export function filterStudentList(
	students: readonly Student[],
	filters: StudentListFilters,
): Student[] {
	const needle = filters.q.trim().toLowerCase();
	return students
		.filter(student => filters.class === 'all' || student.classId === filters.class)
		.filter(student => filters.status === 'all' || student.status === filters.status)
		.filter((student) => {
			if (!needle) {
				return true;
			}
			const haystack = `${student.name} ${student.email}`.toLowerCase();
			return haystack.includes(needle);
		});
}
