import type { ResolvedPathname, RouteId } from '$app/types';
import { appPath } from '$lib/navigation/app-navigation';

type SchoolStudentTabSegment
	= | 'profile'
		| 'grades'
		| 'attendance'
		| 'incidents'
		| 'finances'
		| 'report-card'
		| 'enrollments';

type SchoolStaffTabSegment = 'profile' | 'permissions' | 'assignments';
type SchoolTeacherTabSegment = 'profile' | 'assignments' | 'availability';
type ClassPlanningTabSegment = 'details' | 'attendance' | 'logbook';
type ClassEvaluationTabSegment = 'details' | 'grading';

const STUDENT_TAB_ROUTES: Record<SchoolStudentTabSegment, RouteId> = {
	'profile': '/(app)/school/students/[[id]]/(tabs)/profile',
	'grades': '/(app)/school/students/[[id]]/(tabs)/grades',
	'attendance': '/(app)/school/students/[[id]]/(tabs)/attendance',
	'incidents': '/(app)/school/students/[[id]]/(tabs)/incidents',
	'finances': '/(app)/school/students/[[id]]/(tabs)/finances',
	'report-card': '/(app)/school/students/[[id]]/(tabs)/report-card',
	'enrollments': '/(app)/school/students/[[id]]/(tabs)/enrollments',
};

const STAFF_TAB_ROUTES: Record<SchoolStaffTabSegment, RouteId> = {
	profile: '/(app)/school/staff/[[id]]/(tabs)/profile',
	permissions: '/(app)/school/staff/[[id]]/(tabs)/permissions',
	assignments: '/(app)/school/staff/[[id]]/(tabs)/assignments',
};

const TEACHER_TAB_ROUTES: Record<SchoolTeacherTabSegment, RouteId> = {
	profile: '/(app)/school/teachers/[[id]]/(tabs)/profile',
	assignments: '/(app)/school/teachers/[[id]]/(tabs)/assignments',
	availability: '/(app)/school/teachers/[[id]]/(tabs)/availability',
};

const PLANNING_TAB_ROUTES: Record<ClassPlanningTabSegment, RouteId> = {
	details: '/(app)/classes/[classId]/timetable/[id]/(tabs)/details',
	attendance: '/(app)/classes/[classId]/timetable/[id]/(tabs)/attendance',
	logbook: '/(app)/classes/[classId]/timetable/[id]/(tabs)/logbook',
};

const EVALUATION_TAB_ROUTES: Record<ClassEvaluationTabSegment, RouteId> = {
	details: '/(app)/classes/[classId]/evaluations/[[id]]/(tabs)/details',
	grading: '/(app)/classes/[classId]/evaluations/[[id]]/(tabs)/grading',
};

type SchoolActivityTabSegment = 'profile' | 'students' | 'classes';

const ACTIVITY_TAB_ROUTES: Record<SchoolActivityTabSegment, RouteId> = {
	profile: '/(app)/school/activities/[[id]]/(tabs)/profile',
	students: '/(app)/school/activities/[[id]]/(tabs)/students',
	classes: '/(app)/school/activities/[[id]]/(tabs)/classes',
};

export const detailHref = {
	schoolStudent: (id: string): ResolvedPathname => appPath('/(app)/school/students/[[id]]/(tabs)/profile', { id }),
	schoolStudentTab: (id: string, tab: SchoolStudentTabSegment = 'profile'): ResolvedPathname =>
		appPath(STUDENT_TAB_ROUTES[tab], { id }),
	schoolGuardian: (id: string): ResolvedPathname => appPath('/(app)/school/guardians/[[id]]', { id }),
	schoolTeacher: (id: string): ResolvedPathname => appPath('/(app)/school/teachers/[[id]]/(tabs)/profile', { id }),
	schoolTeacherTab: (id: string, tab: SchoolTeacherTabSegment = 'profile'): ResolvedPathname =>
		appPath(TEACHER_TAB_ROUTES[tab], { id }),
	schoolActivity: (id: string): ResolvedPathname => appPath('/(app)/school/activities/[[id]]/(tabs)/profile', { id }),
	schoolActivityTab: (id: string, tab: SchoolActivityTabSegment = 'profile'): ResolvedPathname =>
		appPath(ACTIVITY_TAB_ROUTES[tab], { id }),
	schoolAnnouncement: (id: string): ResolvedPathname => appPath('/(app)/school/announcements/[[id]]', { id }),
	schoolIncident: (id: string): ResolvedPathname => appPath('/(app)/school/events/[[id]]', { id }),
	classStudent: (classId: string, id: string): ResolvedPathname =>
		appPath('/(app)/classes/[classId]/students/[[id]]', { classId, id }),
	classSubject: (classId: string, id: string): ResolvedPathname =>
		appPath('/(app)/classes/[classId]/teaching/[[id]]', { classId, id }),
	classPlanning: (classId: string, id?: string): ResolvedPathname =>
		id
			? appPath(PLANNING_TAB_ROUTES.details, { classId, id })
			: appPath('/(app)/classes/[classId]/timetable', { classId }),
	classPlanningTab: (
		classId: string,
		id: string,
		tab: ClassPlanningTabSegment = 'details',
	): ResolvedPathname => appPath(PLANNING_TAB_ROUTES[tab], { classId, id }),
	classEvaluation: (classId: string, id: string): ResolvedPathname =>
		appPath(EVALUATION_TAB_ROUTES.details, { classId, id }),
	classEvaluationTab: (
		classId: string,
		id: string,
		tab: ClassEvaluationTabSegment = 'details',
	): ResolvedPathname => appPath(EVALUATION_TAB_ROUTES[tab], { classId, id }),
	classAttendanceDay: (classId: string, id: string): ResolvedPathname =>
		appPath('/(app)/classes/[classId]/attendance/[[id]]', { classId, id }),
	classTeachingSubject: (classId: string, id: string): ResolvedPathname =>
		appPath('/(app)/classes/[classId]/teaching/[[id]]', { classId, id }),
	classDeadline: (classId: string, id: string): ResolvedPathname =>
		appPath(EVALUATION_TAB_ROUTES.details, { classId, id }),
	configSubject: (id: string): ResolvedPathname => appPath('/(app)/configuration/subjects/[[id]]', { id }),
	configSubjectLevel: (label: string): ResolvedPathname =>
		appPath('/(app)/configuration/subjects/level/[[level]]', { level: label }),
	configStaffGuardian: (id: string): ResolvedPathname => appPath('/(app)/school/staff/[[id]]/(tabs)/profile', { id }),
	configStaffMember: (id: string): ResolvedPathname => appPath('/(app)/school/staff/[[id]]/(tabs)/profile', { id }),
	schoolStaffTab: (id: string, tab: SchoolStaffTabSegment = 'profile'): ResolvedPathname =>
		appPath(STAFF_TAB_ROUTES[tab], { id }),
	configReportCard: (id: string): ResolvedPathname => appPath('/(app)/configuration/report-cards/[[id]]', { id }),
	configGradeLevel: (id: string): ResolvedPathname => appPath('/(app)/configuration/grade-levels/[[id]]', { id }),
	configClassGroup: (id: string): ResolvedPathname => appPath('/(app)/configuration/classes/[[id]]', { id }),
	financeBilling: (id: string): ResolvedPathname => appPath('/(app)/finance/billing/[[id]]', { id }),
	financeFees: (): ResolvedPathname => appPath('/(app)/finance/fees'),
	classReportCard: (classId: string, id: string): ResolvedPathname =>
		appPath('/(app)/classes/[classId]/report-cards/[[id]]', { classId, id }),
	accountInbox: (id?: string): ResolvedPathname =>
		appPath('/(app)/account/inbox/[[id]]', id ? { id } : {}),
	accountNotifications: (): ResolvedPathname => appPath('/(app)/account/notifications'),
};
