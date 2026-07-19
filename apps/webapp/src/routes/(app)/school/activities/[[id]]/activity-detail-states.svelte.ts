import type { ActivitiesPageState } from '../activities-page.svelte';
import {
	ActivityClassesTabState,
	setActivityClassesTabState,
} from './(tabs)/classes/activity-classes-tab.svelte';
import {
	ActivityStudentsTabState,
	setActivityStudentsTabState,
} from './(tabs)/students/activity-students-tab.svelte';

export interface ActivityDetailTabStates {
	students: ActivityStudentsTabState;
	classes: ActivityClassesTabState;
}

export function createAndRegisterActivityDetailStates(
	getPage: () => ActivitiesPageState,
): ActivityDetailTabStates {
	const states: ActivityDetailTabStates = {
		students: new ActivityStudentsTabState(getPage),
		classes: new ActivityClassesTabState(getPage),
	};

	setActivityStudentsTabState(states.students);
	setActivityClassesTabState(states.classes);

	return states;
}

export function clearActivityDetailTabStates(states: ActivityDetailTabStates) {
	states.students.clear();
	states.classes.clear();
}
