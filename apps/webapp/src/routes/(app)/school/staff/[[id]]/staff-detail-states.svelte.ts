import type { StaffPageState } from '../staff-page.svelte';
import {
	StaffAssignmentsTabState,
	setStaffAssignmentsTabState,
} from './(tabs)/assignments/staff-assignments-tab.svelte';
import {
	StaffPermissionsTabState,
	setStaffPermissionsTabState,
} from './(tabs)/permissions/staff-permissions-tab.svelte';

export interface StaffDetailTabStates {
	permissions: StaffPermissionsTabState;
	assignments: StaffAssignmentsTabState;
}

export function createAndRegisterStaffDetailStates(
	getPage: () => StaffPageState,
): StaffDetailTabStates {
	const states: StaffDetailTabStates = {
		permissions: new StaffPermissionsTabState(getPage),
		assignments: new StaffAssignmentsTabState(getPage),
	};

	setStaffPermissionsTabState(states.permissions);
	setStaffAssignmentsTabState(states.assignments);

	return states;
}

export function clearStaffDetailTabStates(states: StaffDetailTabStates) {
	states.permissions.clear();
	states.assignments.clear();
}
