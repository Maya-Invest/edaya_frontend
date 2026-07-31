import type { StudentListFilters } from '$lib/list/list-url-filters';
import type { Student } from '$lib/types/school';
import { academicContext } from '$lib/academic/context.svelte';
import { ListFiltersState } from '$lib/list/list-filters-state.svelte';
import { readStudentListFilters, writeStudentListFilters } from '$lib/list/list-url-filters';
import { appGoto } from '$lib/navigation/app-navigation';
import { studentMatchesSearchQuery } from '$lib/students/matches-student-search-query';
import { getContext, setContext } from 'svelte';

const SCHOOL_STUDENTS_STATE_KEY = Symbol('school-students-state');

export class SchoolStudentsState {
	readonly filters: ListFiltersState<StudentListFilters>;

	constructor(getUrl: () => URL) {
		this.filters = new ListFiltersState(
			{
				getUrl,
				write: writeStudentListFilters,
				goto: href => appGoto(href, { replaceState: true, keepFocus: true, noScroll: true }),
			},
			() => readStudentListFilters(getUrl()),
		);
	}

	get classes() {
		return academicContext.classes;
	}

	get hierarchy() {
		return academicContext.hierarchy;
	}

	filterVisible(students: readonly Student[]): Student[] {
		const { q, class: classFilter, status, sort } = this.filters.values;
		const filtered = students
			.filter(s => classFilter === 'all' || s.classId === classFilter)
			.filter(s => status === 'all' || s.status === status)
			.filter(s => studentMatchesSearchQuery(s, q));
		switch (sort) {
			case 'name':
				return [...filtered].sort((left, right) => left.name.localeCompare(right.name, 'fr'));
			case 'average':
				return [...filtered].sort((left, right) => right.average - left.average || left.name.localeCompare(right.name, 'fr'));
			case 'attendance':
				return [...filtered].sort((left, right) => (right.attendance ?? -1) - (left.attendance ?? -1) || left.name.localeCompare(right.name, 'fr'));
			case 'status':
				return [...filtered].sort((left, right) => left.status.localeCompare(right.status, 'fr') || left.name.localeCompare(right.name, 'fr'));
			default:
				return filtered;
		}
	}

	hydrateFromUrl(url: URL) {
		this.filters.hydrate(readStudentListFilters(url));
	}
}

export function setSchoolStudentsState(state: SchoolStudentsState) {
	setContext(SCHOOL_STUDENTS_STATE_KEY, state);
}

export function getSchoolStudentsState(): SchoolStudentsState {
	return getContext<SchoolStudentsState>(SCHOOL_STUDENTS_STATE_KEY);
}
