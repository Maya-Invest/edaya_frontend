import type { Student } from '$lib/types/school';
import { academicContext } from '$lib/academic/context.svelte';
import { ListFiltersState } from '$lib/list/list-filters-state.svelte';
import { readStudentListFilters, writeStudentListFilters } from '$lib/list/list-url-filters';
import { appGoto } from '$lib/navigation/app-navigation';
import { getContext, setContext } from 'svelte';

const SCHOOL_STUDENTS_STATE_KEY = Symbol('school-students-state');

export class SchoolStudentsState {
	readonly filters: ListFiltersState<{ q: string; class: string; status: string }>;

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
		const { q, class: classFilter, status } = this.filters.values;
		const needle = q.toLowerCase();
		return students
			.filter(s => classFilter === 'all' || s.classId === classFilter)
			.filter(s => status === 'all' || s.status === status)
			.filter(s => s.name.toLowerCase().includes(needle));
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
