import { detailDataContext } from '$lib/detail-data/context.svelte';
import { detailHref } from '$lib/detail-hrefs';
import { ListFiltersState } from '$lib/list/list-filters-state.svelte';
import { readTeacherListFilters, writeTeacherListFilters } from '$lib/list/list-url-filters';
import { appGoto } from '$lib/navigation/app-navigation';
import { getContext, setContext } from 'svelte';

const TEACHERS_STATE_KEY = Symbol('teachers-state');

export class TeachersState {
	readonly filters: ListFiltersState<{ q: string }>;

	constructor(getUrl: () => URL) {
		this.filters = new ListFiltersState(
			{
				getUrl,
				write: writeTeacherListFilters,
				goto: href => appGoto(href, { replaceState: true, keepFocus: true, noScroll: true }),
			},
			() => readTeacherListFilters(getUrl()),
		);
	}

	assignmentCount(teacherId: string): number {
		return detailDataContext.teacherAssignmentsForTeacher(teacherId).length;
	}

	hydrateFromUrl(url: URL) {
		this.filters.hydrate(readTeacherListFilters(url));
	}

	handleCreated(teacherId: string) {
		appGoto(detailHref.schoolTeacher(teacherId));
	}
}

export function setTeachersState(state: TeachersState) {
	setContext(TEACHERS_STATE_KEY, state);
}

export function getTeachersState(): TeachersState {
	return getContext<TeachersState>(TEACHERS_STATE_KEY);
}
