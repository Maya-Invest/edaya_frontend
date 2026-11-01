import type { StaffPageState } from '../staff-page.svelte';
import {
	StaffPermissionsTabState,
	setStaffPermissionsTabState,
} from './(tabs)/permissions/staff-permissions-tab.svelte';

export interface StaffDetailTabStates {
	permissions: StaffPermissionsTabState;
}

export function createAndRegisterStaffDetailStates(
	getPage: () => StaffPageState,
): StaffDetailTabStates {
	const states: StaffDetailTabStates = {
		permissions: new StaffPermissionsTabState(getPage),
	};

	setStaffPermissionsTabState(states.permissions);

	return states;
}

export function clearStaffDetailTabStates(states: StaffDetailTabStates) {
	states.permissions.clear();
}
