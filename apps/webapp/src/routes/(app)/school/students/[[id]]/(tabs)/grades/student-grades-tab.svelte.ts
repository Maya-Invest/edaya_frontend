import type { components } from '$lib/api/schema';
import { getBrowserSchoolClient } from '$lib/api/school-client';
import { getContext, setContext } from 'svelte';
import { StudentHistoryState } from '../../../lib/student-history-state.svelte';
import { STUDENT_SUBJECT_QUERY_KEY } from './student-subject-url';

export { buildStudentGradeSummaryFromRows } from './student-grades-tab.selectors';

const STUDENT_GRADES_TAB_KEY = Symbol('student-grades-tab');

export class StudentGradesTabState extends StudentHistoryState<components['schemas']['StudentGradeHistoryPage']> {
	constructor() {
		super(
			({ studentId, subject }, cursor, signal) => getBrowserSchoolClient().queries.getStudentGradeHistory({ studentId, subject, cursor }, { signal }),
			url => url.searchParams.get(STUDENT_SUBJECT_QUERY_KEY) || undefined,
		);
	}
}

export function setStudentGradesTabState(state: StudentGradesTabState) {
	setContext(STUDENT_GRADES_TAB_KEY, state);
}

export function getStudentGradesTabState() {
	return getContext<StudentGradesTabState>(STUDENT_GRADES_TAB_KEY);
}
