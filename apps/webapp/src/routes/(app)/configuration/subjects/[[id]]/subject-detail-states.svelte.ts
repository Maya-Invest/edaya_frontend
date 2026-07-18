import {
	setSubjectProgressionTabState,
	SubjectProgressionTabState,
} from './(tabs)/progression/subject-progression-tab.svelte';

export interface SubjectDetailTabStates {
	progression: SubjectProgressionTabState;
}

export function createAndRegisterSubjectDetailStates(): SubjectDetailTabStates {
	const states: SubjectDetailTabStates = {
		progression: new SubjectProgressionTabState(),
	};

	setSubjectProgressionTabState(states.progression);

	return states;
}

export function clearSubjectDetailTabStates(states: SubjectDetailTabStates) {
	states.progression.clear();
}
