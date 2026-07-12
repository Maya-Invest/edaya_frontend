import type { TeachersPageState } from '../teachers-page.svelte';
import {
	TeacherAssignmentsTabState,
	setTeacherAssignmentsTabState,
} from './(tabs)/assignments/teacher-assignments-tab.svelte';
import {
	TeacherAvailabilityTabState,
	setTeacherAvailabilityTabState,
} from './(tabs)/availability/teacher-availability-tab.svelte';

export interface TeacherDetailTabStates {
	assignments: TeacherAssignmentsTabState;
	availability: TeacherAvailabilityTabState;
}

export function createAndRegisterTeacherDetailStates(
	getPage: () => TeachersPageState,
): TeacherDetailTabStates {
	const states: TeacherDetailTabStates = {
		assignments: new TeacherAssignmentsTabState(getPage),
		availability: new TeacherAvailabilityTabState(getPage),
	};

	setTeacherAssignmentsTabState(states.assignments);
	setTeacherAvailabilityTabState(states.availability);

	return states;
}

export function clearTeacherDetailTabStates(states: TeacherDetailTabStates) {
	states.assignments.clear();
	states.availability.clear();
}
