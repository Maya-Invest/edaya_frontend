import { getContext, setContext } from 'svelte';

export class SchoolStudentsViewState {

}

const SCHOOL_STUDENTS_VIEW_STATE_KEY = Symbol('school-students-view-state');

export function setSchoolStudentsState(state: SchoolStudentsViewState) {
	setContext(SCHOOL_STUDENTS_VIEW_STATE_KEY, state);
}

export function getSchoolStudentsState(): SchoolStudentsViewState {
	return getContext<SchoolStudentsViewState>(SCHOOL_STUDENTS_VIEW_STATE_KEY);
}
