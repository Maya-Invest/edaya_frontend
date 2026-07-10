import type { StudentListFilters } from '$lib/list/list-url-filters';
import type { Student } from '$lib/types/school';

export function studentListUsesFullRoster(filters: Pick<StudentListFilters, 'q' | 'status' | 'sort'>) {
	return filters.q.trim() !== '' || filters.status !== 'all' || filters.sort !== 'roster';
}

function sortStudentList(students: Student[], sort: StudentListFilters['sort']): Student[] {
	switch (sort) {
		case 'name':
			return [...students].sort((left, right) => left.name.localeCompare(right.name, 'fr'));
		case 'average':
			return [...students].sort((left, right) => right.average - left.average || left.name.localeCompare(right.name, 'fr'));
		case 'attendance':
			return [...students].sort((left, right) => right.attendance - left.attendance || left.name.localeCompare(right.name, 'fr'));
		case 'status':
			return [...students].sort((left, right) => left.status.localeCompare(right.status, 'fr') || left.name.localeCompare(right.name, 'fr'));
		default:
			return students;
	}
}

export function filterStudentList(
	students: readonly Student[],
	filters: StudentListFilters,
): Student[] {
	const needle = filters.q.trim().toLowerCase();
	const filtered = students
		.filter(student => filters.class === 'all' || student.classId === filters.class)
		.filter(student => filters.status === 'all' || student.status === filters.status)
		.filter((student) => {
			if (!needle) {
				return true;
			}
			const haystack = `${student.name} ${student.email}`.toLowerCase();
			return haystack.includes(needle);
		});
	return sortStudentList(filtered, filters.sort);
}
