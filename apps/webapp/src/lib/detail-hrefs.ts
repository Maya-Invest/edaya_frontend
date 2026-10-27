import type { ResolvedPathname, RouteId } from '$app/types';
import { appPath } from '$lib/navigation/app-navigation';

type SchoolStudentTabSegment
	= | 'profile'
		| 'grades'
		| 'attendance'
		| 'incidents'
		| 'finances'
		| 'report-card'
		| 'enrollments'
		| 'documents';

type SchoolStaffTabSegment = 'profile' | 'permissions';
type SchoolTeacherTabSegment
	= | 'profile'
		| 'assignments'
		| 'availability'
		| 'timetable'
		| 'evaluations'
		| 'family-feedback'
		| 'documents';
type ClassPlanningTabSegment = 'details' | 'attendance' | 'logbook';
type ClassEvaluationTabSegment = 'details' | 'grading';
type ClassTeachingTabSegment = 'progression' | 'logbook' | 'students';
type ConfigSubjectTabSegment = 'progression' | 'logbook';
type ConfigClassGroupTabSegment = 'profile' | 'assignments';

const STUDENT_TAB_ROUTES: Record<SchoolStudentTabSegment, RouteId> = {
	'profile': '/(app)/school/students/[[id]]/(tabs)/profile',
	'grades': '/(app)/school/students/[[id]]/(tabs)/grades',
	'attendance': '/(app)/school/students/[[id]]/(tabs)/attendance',
	'incidents': '/(app)/school/students/[[id]]/(tabs)/incidents',
	'finances': '/(app)/school/students/[[id]]/(tabs)/finances',
	'report-card': '/(app)/school/students/[[id]]/(tabs)/report-card',
	'enrollments': '/(app)/school/students/[[id]]/(tabs)/enrollments',
	'documents': '/(app)/school/students/[[id]]/(tabs)/documents',
};

const CLASS_STUDENT_TAB_ROUTES: Record<SchoolStudentTabSegment, RouteId> = {
	'profile': '/(app)/classes/[classId]/students/[[id]]/(tabs)/profile',
	'grades': '/(app)/classes/[classId]/students/[[id]]/(tabs)/grades',
	'attendance': '/(app)/classes/[classId]/students/[[id]]/(tabs)/attendance',
	'incidents': '/(app)/classes/[classId]/students/[[id]]/(tabs)/incidents',
	'finances': '/(app)/classes/[classId]/students/[[id]]/(tabs)/finances',
	'report-card': '/(app)/classes/[classId]/students/[[id]]/(tabs)/report-card',
	'enrollments': '/(app)/classes/[classId]/students/[[id]]/(tabs)/enrollments',
	'documents': '/(app)/classes/[classId]/students/[[id]]/(tabs)/documents',
};

const STAFF_TAB_ROUTES: Record<SchoolStaffTabSegment, RouteId> = {
	profile: '/(app)/school/staff/[[id]]/(tabs)/profile',
	permissions: '/(app)/school/staff/[[id]]/(tabs)/permissions',
};

const TEACHER_TAB_ROUTES: Record<SchoolTeacherTabSegment, RouteId> = {
	'profile': '/(app)/school/teachers/[[id]]/(tabs)/profile',
	'assignments': '/(app)/school/teachers/[[id]]/(tabs)/assignments',
	'availability': '/(app)/school/teachers/[[id]]/(tabs)/availability',
	'timetable': '/(app)/school/teachers/[[id]]/(tabs)/timetable',
	'evaluations': '/(app)/school/teachers/[[id]]/(tabs)/evaluations',
	'family-feedback': '/(app)/school/teachers/[[id]]/(tabs)/family-feedback',
	'documents': '/(app)/school/teachers/[[id]]/(tabs)/documents',
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

const TEACHING_TAB_ROUTES: Record<ClassTeachingTabSegment, RouteId> = {
	students: '/(app)/classes/[classId]/teaching/[[id]]/(tabs)/students',
	progression: '/(app)/classes/[classId]/teaching/[[id]]/(tabs)/progression',
	logbook: '/(app)/classes/[classId]/teaching/[[id]]/(tabs)/logbook',
};

const CONFIG_SUBJECT_TAB_ROUTES: Record<ConfigSubjectTabSegment, RouteId> = {
	progression: '/(app)/configuration/structure/subjects/[[id]]/(tabs)/progression',
	logbook: '/(app)/configuration/structure/subjects/[[id]]/(tabs)/logbook',
};

const CONFIG_CLASS_GROUP_TAB_ROUTES: Record<ConfigClassGroupTabSegment, RouteId> = {
	profile: '/(app)/configuration/structure/classes/[[id]]/(tabs)/profile',
	assignments: '/(app)/configuration/structure/classes/[[id]]/(tabs)/assignments',
};

type SchoolActivityTabSegment = 'profile' | 'students' | 'classes';
type SchoolFamilyFeedbackTabSegment = 'setup' | 'audience' | 'moderation' | 'results';

const ACTIVITY_TAB_ROUTES: Record<SchoolActivityTabSegment, RouteId> = {
	profile: '/(app)/school/activities/[[id]]/(tabs)/profile',
	students: '/(app)/school/activities/[[id]]/(tabs)/students',
	classes: '/(app)/school/activities/[[id]]/(tabs)/classes',
};

const FAMILY_FEEDBACK_TAB_ROUTES: Record<SchoolFamilyFeedbackTabSegment, RouteId> = {
	setup: '/(app)/school/family-feedback/[[id]]/(tabs)/setup',
	audience: '/(app)/school/family-feedback/[[id]]/(tabs)/audience',
	moderation: '/(app)/school/family-feedback/[[id]]/(tabs)/moderation',
	results: '/(app)/school/family-feedback/[[id]]/(tabs)/results',
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
	schoolFamilyFeedback: (id: string): ResolvedPathname =>
		appPath(FAMILY_FEEDBACK_TAB_ROUTES.setup, { id }),
	schoolFamilyFeedbackTab: (id: string, tab: SchoolFamilyFeedbackTabSegment = 'setup'): ResolvedPathname =>
		appPath(FAMILY_FEEDBACK_TAB_ROUTES[tab], { id }),
	schoolIncident: (id: string): ResolvedPathname => appPath('/(app)/school/events/[[id]]', { id }),
	classStudent: (classId: string, id: string): ResolvedPathname =>
		appPath('/(app)/classes/[classId]/students/[[id]]/(tabs)/profile', { classId, id }),
	classStudentTab: (
		classId: string,
		id: string,
		tab: SchoolStudentTabSegment = 'profile',
	): ResolvedPathname => appPath(CLASS_STUDENT_TAB_ROUTES[tab], { classId, id }),
	classSubject: (classId: string, id: string): ResolvedPathname =>
		appPath(TEACHING_TAB_ROUTES.progression, { classId, id }),
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
		appPath(TEACHING_TAB_ROUTES.progression, { classId, id }),
	classTeachingSubjectTab: (
		classId: string,
		id: string,
		tab: ClassTeachingTabSegment = 'progression',
	): ResolvedPathname => appPath(TEACHING_TAB_ROUTES[tab], { classId, id }),
	classDeadline: (classId: string, id: string): ResolvedPathname =>
		appPath(EVALUATION_TAB_ROUTES.details, { classId, id }),
	configSubject: (id: string): ResolvedPathname => appPath(CONFIG_SUBJECT_TAB_ROUTES.progression, { id }),
	configSubjectTab: (
		id: string,
		tab: ConfigSubjectTabSegment = 'progression',
	): ResolvedPathname => appPath(CONFIG_SUBJECT_TAB_ROUTES[tab], { id }),
	configStaffGuardian: (id: string): ResolvedPathname => appPath('/(app)/school/staff/[[id]]/(tabs)/profile', { id }),
	configStaffMember: (id: string): ResolvedPathname => appPath('/(app)/school/staff/[[id]]/(tabs)/profile', { id }),
	schoolStaffTab: (id: string, tab: SchoolStaffTabSegment = 'profile'): ResolvedPathname =>
		appPath(STAFF_TAB_ROUTES[tab], { id }),
	configNotificationTemplate: (id: string): ResolvedPathname =>
		appPath('/(app)/configuration/notifications/[[id]]', { id }),
	configGradeLevel: (id: string): string => `${appPath('/(app)/configuration/structure/subjects/[[id]]')}?gradeLevel=${encodeURIComponent(id)}`,
	configClassGroup: (id: string): ResolvedPathname => appPath(CONFIG_CLASS_GROUP_TAB_ROUTES.profile, { id }),
	configClassGroupTab: (
		id: string,
		tab: ConfigClassGroupTabSegment = 'profile',
	): ResolvedPathname => appPath(CONFIG_CLASS_GROUP_TAB_ROUTES[tab], { id }),
	financeBilling: (id: string): ResolvedPathname => appPath('/(app)/finance/billing/[[id]]', { id }),
	financeFees: (): ResolvedPathname => appPath('/(app)/finance/fees'),
	classReportCard: (classId: string, id: string): ResolvedPathname =>
		appPath('/(app)/classes/[classId]/report-cards/[[id]]', { classId, id }),
	accountInbox: (id?: string): ResolvedPathname =>
		appPath('/(app)/account/inbox/[[id]]', id ? { id } : {}),
	accountNotifications: (): ResolvedPathname => appPath('/(app)/account/notifications'),
};
