import type { StaffListFilters } from '$lib/list/list-url-filters';
import type { StaffMember } from '$lib/types/school';

export type StaffSortColumn = Exclude<StaffListFilters['sort'], 'roster'>;

export function staffListUsesFullRoster(filters: Pick<StaffListFilters, 'q' | 'sort'>) {
	return filters.q.trim() !== '' || filters.sort !== 'roster';
}

export function cycleStaffListSort(
	filters: Pick<StaffListFilters, 'sort' | 'sortDir'>,
	column: StaffSortColumn,
): Pick<StaffListFilters, 'sort' | 'sortDir'> {
	if (filters.sort !== column) {
		return { sort: column, sortDir: 'asc' };
	}
	if (filters.sortDir === 'asc') {
		return { sort: column, sortDir: 'desc' };
	}
	return { sort: 'roster', sortDir: 'asc' };
}

function compareNames(left: StaffMember, right: StaffMember) {
	return left.name.localeCompare(right.name, 'fr');
}

function primaryClassLabel(staff: StaffMember, classNameById?: ReadonlyMap<string, string>) {
	const classId = staff.classes[0];
	if (!classId) {
		return '';
	}
	return classNameById?.get(classId) ?? classId;
}

function sortStaffList(
	staff: StaffMember[],
	sort: StaffListFilters['sort'],
	sortDir: StaffListFilters['sortDir'],
	classNameById?: ReadonlyMap<string, string>,
): StaffMember[] {
	const direction = sortDir === 'desc' ? -1 : 1;

	switch (sort) {
		case 'name':
			return [...staff].sort((left, right) => direction * compareNames(left, right));
		case 'role':
			return [...staff].sort(
				(left, right) => direction * left.role.localeCompare(right.role, 'fr') || compareNames(left, right),
			);
		case 'classes':
			return [...staff].sort(
				(left, right) => direction * primaryClassLabel(left, classNameById).localeCompare(
					primaryClassLabel(right, classNameById),
					'fr',
				) || compareNames(left, right),
			);
		default:
			return staff;
	}
}

export function filterStaffList(
	staff: readonly StaffMember[],
	filters: StaffListFilters,
	options?: { classNameById?: ReadonlyMap<string, string> },
): StaffMember[] {
	const needle = filters.q.trim().toLowerCase();
	const filtered = staff.filter((member) => {
		if (!needle) {
			return true;
		}
		const haystack = `${member.name} ${member.email}`.toLowerCase();
		return haystack.includes(needle);
	});
	return sortStaffList(filtered, filters.sort, filters.sortDir, options?.classNameById);
}
