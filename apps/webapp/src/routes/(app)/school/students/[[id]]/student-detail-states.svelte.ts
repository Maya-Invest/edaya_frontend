import type { StudentDetailHost } from '../lib/student-detail-host';
import {
	setStudentAttendanceTabState,
	StudentAttendanceTabState,
} from './(tabs)/attendance/student-attendance-tab.svelte';
import {
	setStudentDocumentsTabState,
	StudentDocumentsTabState,
} from './(tabs)/documents/student-documents-tab.svelte';
import {
	setStudentEnrollmentsTabState,
	StudentEnrollmentsTabState,
} from './(tabs)/enrollments/student-enrollments-tab.svelte';
import {
	setStudentFinanceTabState,
	StudentFinanceTabState,
} from './(tabs)/finances/student-finance-tab.svelte';
import {
	setStudentGradesTabState,
	StudentGradesTabState,
} from './(tabs)/grades/student-grades-tab.svelte';
import {
	setStudentIncidentsTabState,
	StudentIncidentsTabState,
} from './(tabs)/incidents/student-incidents-tab.svelte';
import {
	setStudentProfileTabState,
	StudentProfileTabState,
} from './(tabs)/profile/student-profile-tab.svelte';
import {
	setStudentReportCardTabState,
	StudentReportCardTabState,
} from './(tabs)/report-card/student-report-card-tab.svelte';
import { AnnualReportCardState } from './annual-report-card-state.svelte';

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
	const annual = new AnnualReportCardState(getPage);
	const states: StudentDetailTabStates = {
		profile: new StudentProfileTabState(getPage),
		grades: new StudentGradesTabState(),
		attendance: new StudentAttendanceTabState(),
		incidents: new StudentIncidentsTabState(getPage),
		finances: new StudentFinanceTabState(getPage),
		reportCard: new StudentReportCardTabState(getPage, annual),
		enrollments: new StudentEnrollmentsTabState(getPage),
		documents: new StudentDocumentsTabState(getPage, annual),
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
