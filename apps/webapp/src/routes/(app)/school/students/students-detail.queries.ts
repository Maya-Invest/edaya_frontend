import type { StudentsPageState } from './students-page.svelte';
import { academicContext } from '$lib/academic/context.svelte';
import { loadClassEvaluationsPageData } from '$lib/api/assessments-data';
import { loadFinanceData } from '$lib/api/finance-data';
import { loadGuardiansPeopleData } from '$lib/api/people-data';
import { loadClassReportCardResultsData } from '$lib/api/report-cards-data';
import { getBrowserSchoolClient } from '$lib/api/school-client';
import { loadIncidentRouteData } from '$lib/api/school-life-data';
import { fetchStaffMembers } from '$lib/api/staff-data';
import { loadStudent360Data } from '$lib/api/student-360-data';
import {
	loadStudentAttendanceHistory,
	loadStudentEnrollmentHistory,
	loadStudentGradeRows,
} from '$lib/api/student-drawer-data';
import { authSession } from '$lib/auth/session.svelte';
import { resolvePageLoad } from '$lib/queries/page-status';
import { loadReportCardCatalogIntoDetail } from './students-mutations';
import { schoolStudentDetailIdFromUrl } from './students-page.svelte';

function studentIdFromUrl(url: URL): string | undefined {
	return schoolStudentDetailIdFromUrl(url);
}

function schoolScope() {
	return {
		schoolId: authSession.schoolId ?? academicContext.schools[0]?.id ?? '',
		academicYearId: academicContext.yearId,
	};
}

export function queryStudentProfileTab(state: StudentsPageState) {
	return (url: URL) => resolvePageLoad(url, {
		empty: () => ({}),
		load: async () => {
			const studentId = studentIdFromUrl(url);
			if (!studentId) {
				return {};
			}

			const client = getBrowserSchoolClient();
			const scope = schoolScope();
			const [{ healthRecord, pedagogicalNotes }, { guardians }, staff] = await Promise.all([
				loadStudent360Data(client, studentId),
				loadGuardiansPeopleData(client),
				scope.schoolId
					? fetchStaffMembers(client, scope)
					: Promise.resolve([]),
			]);

			state.seedDetail(studentId, {
				health: healthRecord,
				pedagogicalNotes,
				guardians,
				staff,
			});
			return {};
		},
		hasItems: () => true,
		waitForShell: false,
	});
}

export function queryStudentGradesTab(state: StudentsPageState) {
	return (url: URL) => resolvePageLoad(url, {
		empty: () => ({}),
		load: async () => {
			const studentId = studentIdFromUrl(url);
			const student = studentId ? state.findStudent(studentId) : undefined;
			if (!studentId || !student) {
				return {};
			}

			const client = getBrowserSchoolClient();
			const [grades, { evaluations, assessmentResults }] = await Promise.all([
				loadStudentGradeRows(client, studentId),
				loadClassEvaluationsPageData(client, student.classId, academicContext.periodId),
			]);

			state.seedDetail(studentId, {
				grades,
				evaluations,
				assessmentResults,
			});
			return {};
		},
		hasItems: () => true,
		waitForShell: false,
	});
}

export function queryStudentAttendanceTab(state: StudentsPageState) {
	return (url: URL) => resolvePageLoad(url, {
		empty: () => ({}),
		load: async () => {
			const studentId = studentIdFromUrl(url);
			if (!studentId) {
				return {};
			}

			const attendance = await loadStudentAttendanceHistory(getBrowserSchoolClient(), studentId);
			state.seedDetail(studentId, { attendance });
			return {};
		},
		hasItems: () => true,
		waitForShell: false,
	});
}

export function queryStudentIncidentsTab(state: StudentsPageState) {
	return (url: URL) => resolvePageLoad(url, {
		empty: () => ({}),
		load: async () => {
			const studentId = studentIdFromUrl(url);
			if (!studentId) {
				return {};
			}

			const scope = schoolScope();
			if (!scope.schoolId) {
				return {};
			}

			const { incidents } = await loadIncidentRouteData(getBrowserSchoolClient(), scope);
			state.seedDetail(studentId, {
				incidents: incidents.filter(incident => incident.involvedStudentIds.includes(studentId)),
			});
			return {};
		},
		hasItems: () => true,
		waitForShell: false,
	});
}

export function queryStudentFinancesTab(state: StudentsPageState) {
	return (url: URL) => resolvePageLoad(url, {
		empty: () => ({}),
		load: async () => {
			const studentId = studentIdFromUrl(url);
			if (!studentId) {
				return {};
			}

			const scope = schoolScope();
			if (!scope.schoolId) {
				return {};
			}

			const { fees, billing } = await loadFinanceData(getBrowserSchoolClient(), scope);
			state.seedDetail(studentId, {
				fees,
				billing: billing.filter(item => item.studentId === studentId),
			});
			return {};
		},
		hasItems: () => true,
		waitForShell: false,
	});
}

export function queryStudentReportCardTab(state: StudentsPageState) {
	return (url: URL) => resolvePageLoad(url, {
		empty: () => ({}),
		load: async () => {
			const studentId = studentIdFromUrl(url);
			const student = studentId ? state.findStudent(studentId) : undefined;
			if (!studentId || !student) {
				return {};
			}

			await loadReportCardCatalogIntoDetail(state, studentId);
			const catalog = state.detail;
			const definitions = catalog?.reportCardDefinitions ?? [];
			const results = await loadClassReportCardResultsData(
				getBrowserSchoolClient(),
				student.classId,
				academicContext.periodId,
				definitions,
			);
			state.seedDetail(studentId, {
				reportCardResults: results.filter(result => result.studentId === studentId),
			});
			return {};
		},
		hasItems: () => true,
		waitForShell: false,
	});
}

export function queryStudentEnrollmentsTab(state: StudentsPageState) {
	return (url: URL) => resolvePageLoad(url, {
		empty: () => ({}),
		load: async () => {
			const studentId = studentIdFromUrl(url);
			if (!studentId) {
				return {};
			}

			const enrollments = await loadStudentEnrollmentHistory(getBrowserSchoolClient(), studentId);
			state.seedDetail(studentId, { enrollments });
			return {};
		},
		hasItems: () => true,
		waitForShell: false,
	});
}
