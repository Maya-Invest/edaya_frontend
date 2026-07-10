import type { GuardianListFilters } from '$lib/list/list-url-filters';
import type { Guardian, Student } from '$lib/types/school';
import { linkedStudentsForGuardian } from './guardian-selectors';

export type GuardianSortColumn = Exclude<GuardianListFilters['sort'], 'roster'>;

export function guardianListUsesFullRoster(filters: Pick<GuardianListFilters, 'q' | 'sort'>) {
	return filters.q.trim() !== '' || filters.sort !== 'roster';
}

export function cycleGuardianListSort(
	filters: Pick<GuardianListFilters, 'sort' | 'sortDir'>,
	column: GuardianSortColumn,
): Pick<GuardianListFilters, 'sort' | 'sortDir'> {
	if (filters.sort !== column) {
		return { sort: column, sortDir: 'asc' };
	}
	if (filters.sortDir === 'asc') {
		return { sort: column, sortDir: 'desc' };
	}
	return { sort: 'roster', sortDir: 'asc' };
}

function compareNames(left: Guardian, right: Guardian) {
	return left.name.localeCompare(right.name, 'fr');
}

function primaryLinkedStudentName(guardian: Guardian, students: readonly Student[]) {
	return linkedStudentsForGuardian(students, guardian)[0]?.name ?? '';
}

function sortGuardianList(
	guardians: Guardian[],
	sort: GuardianListFilters['sort'],
	sortDir: GuardianListFilters['sortDir'],
	students: readonly Student[],
): Guardian[] {
	const direction = sortDir === 'desc' ? -1 : 1;

	switch (sort) {
		case 'name':
			return [...guardians].sort((left, right) => direction * compareNames(left, right));
		case 'relation':
			return [...guardians].sort(
				(left, right) => direction * left.relation.localeCompare(right.relation, 'fr') || compareNames(left, right),
			);
		case 'phone':
			return [...guardians].sort(
				(left, right) => direction * left.phone.localeCompare(right.phone, 'fr') || compareNames(left, right),
			);
		case 'students':
			return [...guardians].sort(
				(left, right) => direction * primaryLinkedStudentName(left, students).localeCompare(
					primaryLinkedStudentName(right, students),
					'fr',
				) || compareNames(left, right),
			);
		default:
			return guardians;
	}
}

export function filterGuardianList(
	guardians: readonly Guardian[],
	filters: GuardianListFilters,
	options?: { students?: readonly Student[] },
): Guardian[] {
	const students = options?.students ?? [];
	const needle = filters.q.trim().toLowerCase();
	const filtered = guardians.filter((guardian) => {
		if (!needle) {
			return true;
		}
		const haystack = `${guardian.name} ${guardian.email} ${guardian.phone}`.toLowerCase();
		return haystack.includes(needle);
	});
	return sortGuardianList(filtered, filters.sort, filters.sortDir, students);
}
