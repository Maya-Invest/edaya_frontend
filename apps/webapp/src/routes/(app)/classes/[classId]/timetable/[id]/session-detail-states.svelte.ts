import type { TimetablePageState } from '../timetable-page.svelte';
import {
	SessionAttendanceTabState,
	setSessionAttendanceTabState,
} from './(tabs)/attendance/session-attendance-tab.svelte';
import {
	SessionLogbookTabState,
	setSessionLogbookTabState,
} from './(tabs)/logbook/session-logbook-tab.svelte';

export interface SessionDetailTabStates {
	attendance: SessionAttendanceTabState;
	logbook: SessionLogbookTabState;
}

export function createAndRegisterSessionDetailStates(
	getPage: () => TimetablePageState,
): SessionDetailTabStates {
	const states: SessionDetailTabStates = {
		attendance: new SessionAttendanceTabState(getPage),
		logbook: new SessionLogbookTabState(getPage),
	};

	setSessionAttendanceTabState(states.attendance);
	setSessionLogbookTabState(states.logbook);

	return states;
}

export function clearSessionDetailTabStates(states: SessionDetailTabStates) {
	states.attendance.clear();
	states.logbook.clear();
}
