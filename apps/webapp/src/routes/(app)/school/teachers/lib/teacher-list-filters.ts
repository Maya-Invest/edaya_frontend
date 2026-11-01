import type { TeacherListFilters } from '$lib/list/list-url-filters';
import type { Teacher } from '$lib/types/school';

export type TeacherSortColumn = Exclude<TeacherListFilters['sort'], 'roster'>;

export function teacherListUsesFullRoster(filters: Pick<TeacherListFilters, 'q' | 'sort' | 'status'>) {
	return filters.q.trim() !== '' || filters.sort !== 'roster' || (filters.status ?? 'all') !== 'all';
}

export function cycleTeacherListSort(
	filters: Pick<TeacherListFilters, 'sort' | 'sortDir'>,
	column: TeacherSortColumn,
): Pick<TeacherListFilters, 'sort' | 'sortDir'> {
	if (filters.sort !== column) {
		return { sort: column, sortDir: 'asc' };
	}
	if (filters.sortDir === 'asc') {
		return { sort: column, sortDir: 'desc' };
	}
	return { sort: 'roster', sortDir: 'asc' };
}

function compareNames(left: Teacher, right: Teacher) {
	return left.name.localeCompare(right.name, 'fr');
}

function sortTeacherList(
	teachers: Teacher[],
	sort: TeacherListFilters['sort'],
	sortDir: TeacherListFilters['sortDir'],
	assignmentCount: (teacherId: string) => number,
): Teacher[] {
	const direction = sortDir === 'desc' ? -1 : 1;

	switch (sort) {
		case 'name':
			return [...teachers].sort((left, right) => direction * compareNames(left, right));
		case 'assignments':
			return [...teachers].sort(
				(left, right) => direction * (assignmentCount(left.id) - assignmentCount(right.id))
					|| compareNames(left, right),
			);
		case 'status':
			return [...teachers].sort(
				(left, right) => direction * Number(right.isActive) - Number(left.isActive)
					|| compareNames(left, right),
			);
		default:
			return teachers;
	}
}

export function filterTeacherList(
	teachers: readonly Teacher[],
	filters: TeacherListFilters,
	options?: { assignmentCount?: (teacherId: string) => number },
): Teacher[] {
	const assignmentCount = options?.assignmentCount ?? (() => 0);
	const needle = filters.q.trim().toLowerCase();
	const status = filters.status ?? 'all';
	const filtered = teachers.filter((teacher) => {
		if (status === 'active' && !teacher.isActive) {
			return false;
		}
		if (status === 'inactive' && teacher.isActive) {
			return false;
		}
		if (!needle) {
			return true;
		}
		const haystack = `${teacher.name} ${teacher.email} ${teacher.phone} ${teacher.code ?? ''}`.toLowerCase();
		return haystack.includes(needle);
	});
	return sortTeacherList(filtered, filters.sort, filters.sortDir, assignmentCount);
}
