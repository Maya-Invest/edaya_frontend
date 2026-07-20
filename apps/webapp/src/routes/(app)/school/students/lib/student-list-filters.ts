import type { StudentListFilters } from '$lib/list/list-url-filters';
import type { Student } from '$lib/types/school';
import { studentMatchesSearchQuery } from '$lib/students/matches-student-search-query';

export type StudentSortColumn = Exclude<StudentListFilters['sort'], 'roster'>;

export function studentListUsesFullRoster(filters: Pick<StudentListFilters, 'q' | 'status' | 'sort'>) {
	return filters.q.trim() !== '' || filters.status !== 'all' || filters.sort !== 'roster';
}

export function cycleStudentListSort(
	filters: Pick<StudentListFilters, 'sort' | 'sortDir'>,
	column: StudentSortColumn,
): Pick<StudentListFilters, 'sort' | 'sortDir'> {
	if (filters.sort !== column) {
		return { sort: column, sortDir: 'asc' };
	}
	if (filters.sortDir === 'asc') {
		return { sort: column, sortDir: 'desc' };
	}
	return { sort: 'roster', sortDir: 'asc' };
}

function compareNames(left: Student, right: Student) {
	return left.name.localeCompare(right.name, 'fr');
}

function classLabel(student: Student, classNameById?: ReadonlyMap<string, string>) {
	return classNameById?.get(student.classId) ?? student.classId;
}

function sortStudentList(
	students: Student[],
	sort: StudentListFilters['sort'],
	sortDir: StudentListFilters['sortDir'],
	classNameById?: ReadonlyMap<string, string>,
): Student[] {
	const direction = sortDir === 'desc' ? -1 : 1;

	switch (sort) {
		case 'name':
			return [...students].sort((left, right) => direction * compareNames(left, right));
		case 'class':
			return [...students].sort(
				(left, right) => direction * classLabel(left, classNameById).localeCompare(classLabel(right, classNameById), 'fr')
					|| compareNames(left, right),
			);
		case 'average':
			return [...students].sort(
				(left, right) => direction * (left.average - right.average) || compareNames(left, right),
			);
		case 'attendance':
			return [...students].sort(
				(left, right) => direction * (left.attendance - right.attendance) || compareNames(left, right),
			);
		case 'status':
			return [...students].sort(
				(left, right) => direction * left.status.localeCompare(right.status, 'fr') || compareNames(left, right),
			);
		default:
			return students;
	}
}

export function filterStudentList(
	students: readonly Student[],
	filters: StudentListFilters,
	options?: { classNameById?: ReadonlyMap<string, string> },
): Student[] {
	const filtered = students
		.filter(student => filters.class === 'all' || student.classId === filters.class)
		.filter(student => filters.status === 'all' || student.status === filters.status)
		.filter(student => studentMatchesSearchQuery(student, filters.q));
	return sortStudentList(filtered, filters.sort, filters.sortDir, options?.classNameById);
}
