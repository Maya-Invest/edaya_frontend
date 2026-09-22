import type { StudentDetailHost } from '../lib/student-detail-host';
import {
	StudentAttendanceTabState,
	setStudentAttendanceTabState,
} from './(tabs)/attendance/student-attendance-tab.svelte';
import {
	StudentDocumentsTabState,
	setStudentDocumentsTabState,
} from './(tabs)/documents/student-documents-tab.svelte';
import {
	StudentEnrollmentsTabState,
	setStudentEnrollmentsTabState,
} from './(tabs)/enrollments/student-enrollments-tab.svelte';
import {
	StudentFinanceTabState,
	setStudentFinanceTabState,
} from './(tabs)/finances/student-finance-tab.svelte';
import {
	StudentGradesTabState,
	setStudentGradesTabState,
} from './(tabs)/grades/student-grades-tab.svelte';
import {
	StudentIncidentsTabState,
	setStudentIncidentsTabState,
} from './(tabs)/incidents/student-incidents-tab.svelte';
import {
	StudentProfileTabState,
	setStudentProfileTabState,
} from './(tabs)/profile/student-profile-tab.svelte';
import {
	StudentReportCardTabState,
	setStudentReportCardTabState,
} from './(tabs)/report-card/student-report-card-tab.svelte';

export interface StudentDetailTabStates {
	profile: StudentProfileTabState;
	grades: StudentGradesTabState;
	attendance: StudentAttendanceTabState;
	incidents: StudentIncidentsTabState;
	finances: StudentFinanceTabState;
	reportCard: StudentReportCardTabState;
	enrollments: StudentEnrollmentsTabState;
	documents: StudentDocumentsTabState;
}

export function createAndRegisterStudentDetailStates(
	getPage: () => StudentDetailHost,
): StudentDetailTabStates {
	const states: StudentDetailTabStates = {
		profile: new StudentProfileTabState(getPage),
		grades: new StudentGradesTabState(),
		attendance: new StudentAttendanceTabState(),
		incidents: new StudentIncidentsTabState(getPage),
		finances: new StudentFinanceTabState(getPage),
		reportCard: new StudentReportCardTabState(getPage),
		enrollments: new StudentEnrollmentsTabState(getPage),
		documents: new StudentDocumentsTabState(getPage),
	};

	setStudentProfileTabState(states.profile);
	setStudentGradesTabState(states.grades);
	setStudentAttendanceTabState(states.attendance);
	setStudentIncidentsTabState(states.incidents);
	setStudentFinanceTabState(states.finances);
	setStudentReportCardTabState(states.reportCard);
	setStudentEnrollmentsTabState(states.enrollments);
	setStudentDocumentsTabState(states.documents);

	return states;
}

export function clearStudentDetailTabStates(states: StudentDetailTabStates) {
	states.profile.clear();
	states.grades.clear();
	states.attendance.clear();
	states.incidents.clear();
	states.finances.clear();
	states.reportCard.clear();
	states.enrollments.clear();
	states.documents.clear();
}
