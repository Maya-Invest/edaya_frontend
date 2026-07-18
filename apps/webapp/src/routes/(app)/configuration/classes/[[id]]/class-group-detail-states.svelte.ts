import type { ClassesPageState } from '../classes-page.svelte';
import {
	ClassGroupAssignmentsTabState,
	setClassGroupAssignmentsTabState,
} from './(tabs)/assignments/class-group-assignments-tab.svelte';

export interface ClassGroupDetailTabStates {
	assignments: ClassGroupAssignmentsTabState;
}

export function createAndRegisterClassGroupDetailStates(
	getPage: () => ClassesPageState,
): ClassGroupDetailTabStates {
	const states: ClassGroupDetailTabStates = {
		assignments: new ClassGroupAssignmentsTabState(getPage),
	};

	setClassGroupAssignmentsTabState(states.assignments);

	return states;
}

export function clearClassGroupDetailTabStates(states: ClassGroupDetailTabStates) {
	states.assignments.clear();
}
