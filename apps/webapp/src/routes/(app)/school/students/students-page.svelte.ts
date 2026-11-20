import type { StudentListFilters } from '$lib/list/list-url-filters';
import { academicContext } from '$lib/academic/context.svelte';
import { ListFiltersState } from '$lib/list/list-filters-state.svelte';
import { readStudentListFilters, writeStudentListFilters } from '$lib/list/list-url-filters';
import { appGoto } from '$lib/navigation/app-navigation';
import { getContext, setContext } from 'svelte';
import { schoolDirectoryQuery } from './lib/directory-page';
import { StudentDirectoryState } from './lib/student-directory-state.svelte';
import { createStudentOnPage } from './lib/students-list-mutations';
import { ensureStudentDrawerSelection, querySchoolStudentsPage } from './lib/students-queries';

export type { StudentPhotoSubmission } from './lib/student-detail-host';

export const SCHOOL_STUDENTS_PAGE_SIZE = 25;
const STUDENTS_PAGE_STATE_KEY = Symbol('students-page-state');

export class StudentsPageState extends StudentDirectoryState {
	readonly filters: ListFiltersState<StudentListFilters>;

	constructor(getUrl: () => URL) {
		super(getUrl, SCHOOL_STUDENTS_PAGE_SIZE);
		this.filters = new ListFiltersState(
			{
				getUrl,
				write: writeStudentListFilters,
				goto: href => appGoto(href, { replaceState: true, keepFocus: true, noScroll: true }),
			},
			() => readStudentListFilters(getUrl()),
		);
	}

	get selectedId() {
		return schoolStudentDetailIdFromUrl(this.getUrl());
	}

	protected requestFor(url: URL) {
		return schoolDirectoryQuery(readStudentListFilters(url), academicContext.periodId);
	}

	hydrateFiltersFromUrl() {
		this.filters.hydrate(readStudentListFilters(this.getUrl()));
	}

	async createStudent(...args: Parameters<typeof createStudentOnPage> extends [StudentsPageState, ...infer R] ? R : never) {
		return createStudentOnPage(this, ...args);
	}

	queryListPage() {
		return querySchoolStudentsPage(this);
	}

	ensureDrawerSelection(studentId: string) {
		return ensureStudentDrawerSelection(this, studentId);
	}
}

export function setStudentsPageState(state: StudentsPageState) {
	setContext(STUDENTS_PAGE_STATE_KEY, state);
}

export function getStudentsPageState() {
	return getContext<StudentsPageState>(STUDENTS_PAGE_STATE_KEY);
}

export function schoolStudentDetailIdFromUrl(url: URL): string | undefined {
	const match = url.pathname.match(/\/school\/students\/([^/]+)/);
	return match?.[1];
}
