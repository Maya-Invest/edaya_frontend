import type { TeachersPageState } from '../teachers-page.svelte';
import {
	TeacherAssignmentsTabState,
	setTeacherAssignmentsTabState,
} from './(tabs)/assignments/teacher-assignments-tab.svelte';
import {
	TeacherAvailabilityTabState,
	setTeacherAvailabilityTabState,
} from './(tabs)/availability/teacher-availability-tab.svelte';
import {
	TeacherDocumentsTabState,
	setTeacherDocumentsTabState,
} from './(tabs)/documents/teacher-documents-tab.svelte';
import {
	TeacherEvaluationsTabState,
	setTeacherEvaluationsTabState,
} from './(tabs)/evaluations/teacher-evaluations-tab.svelte';
import {
	TeacherFamilyFeedbackTabState,
	setTeacherFamilyFeedbackTabState,
} from './(tabs)/family-feedback/teacher-family-feedback-tab.svelte';
import {
	TeacherTimetableTabState,
	setTeacherTimetableTabState,
} from './(tabs)/timetable/teacher-timetable-tab.svelte';

export interface TeacherDetailTabStates {
	assignments: TeacherAssignmentsTabState;
	availability: TeacherAvailabilityTabState;
	timetable: TeacherTimetableTabState;
	evaluations: TeacherEvaluationsTabState;
	familyFeedback: TeacherFamilyFeedbackTabState;
	documents: TeacherDocumentsTabState;
}

export function createAndRegisterTeacherDetailStates(
	getPage: () => TeachersPageState,
): TeacherDetailTabStates {
	const states: TeacherDetailTabStates = {
		assignments: new TeacherAssignmentsTabState(getPage),
		availability: new TeacherAvailabilityTabState(getPage),
		timetable: new TeacherTimetableTabState(getPage),
		evaluations: new TeacherEvaluationsTabState(getPage),
		familyFeedback: new TeacherFamilyFeedbackTabState(getPage),
		documents: new TeacherDocumentsTabState(getPage),
	};

	setTeacherAssignmentsTabState(states.assignments);
	setTeacherAvailabilityTabState(states.availability);
	setTeacherTimetableTabState(states.timetable);
	setTeacherEvaluationsTabState(states.evaluations);
	setTeacherFamilyFeedbackTabState(states.familyFeedback);
	setTeacherDocumentsTabState(states.documents);

	return states;
}

export function clearTeacherDetailTabStates(states: TeacherDetailTabStates) {
	states.assignments.clear();
	states.availability.clear();
	states.timetable.clear();
	states.evaluations.clear();
	states.familyFeedback.clear();
	states.documents.clear();
}
