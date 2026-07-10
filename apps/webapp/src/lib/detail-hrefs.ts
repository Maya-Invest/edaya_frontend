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
type SchoolTeacherTabSegment = 'profile' | 'assignments';

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
	'profile': '/(app)/school/staff/[[id]]/(tabs)/profile',
	'permissions': '/(app)/school/staff/[[id]]/(tabs)/permissions',
	'assignments': '/(app)/school/staff/[[id]]/(tabs)/assignments',
};

const TEACHER_TAB_ROUTES: Record<SchoolTeacherTabSegment, RouteId> = {
	'profile': '/(app)/school/teachers/[[id]]/(tabs)/profile',
	'assignments': '/(app)/school/teachers/[[id]]/(tabs)/assignments',
};

export const detailHref = {
	schoolStudent: (id: string): ResolvedPathname => appPath('/(app)/school/students/[[id]]/(tabs)/profile', { id }),
	schoolStudentTab: (id: string, tab: SchoolStudentTabSegment = 'profile'): ResolvedPathname =>
		appPath(STUDENT_TAB_ROUTES[tab], { id }),
	schoolGuardian: (id: string): ResolvedPathname => appPath('/(app)/school/guardians/[[id]]', { id }),
	schoolTeacher: (id: string): ResolvedPathname => appPath('/(app)/school/teachers/[[id]]/(tabs)/profile', { id }),
	schoolTeacherTab: (id: string, tab: SchoolTeacherTabSegment = 'profile'): ResolvedPathname =>
		appPath(TEACHER_TAB_ROUTES[tab], { id }),
	schoolActivity: (id: string): ResolvedPathname => appPath('/(app)/school/activities/[[id]]', { id }),
	schoolAnnouncement: (id: string): ResolvedPathname => appPath('/(app)/school/announcements/[[id]]', { id }),
	schoolIncident: (id: string): ResolvedPathname => appPath('/(app)/school/events/[[id]]', { id }),
	schoolCalendarEvent: (id: string): ResolvedPathname => appPath('/(app)/school/calendar/[[id]]', { id }),
	classStudent: (classId: string, id: string): ResolvedPathname =>
		appPath('/(app)/classes/[classId]/students/[[id]]', { classId, id }),
	classSubject: (classId: string, id: string): ResolvedPathname =>
		appPath('/(app)/classes/[classId]/teaching/[[id]]', { classId, id }),
	classPlanning: (classId: string, id?: string): ResolvedPathname =>
		appPath('/(app)/classes/[classId]/timetable/[[id]]', id ? { classId, id } : { classId }),
	classEvaluation: (classId: string, id: string): ResolvedPathname =>
		appPath('/(app)/classes/[classId]/evaluations/[[id]]', { classId, id }),
	classAttendanceDay: (classId: string, id: string): ResolvedPathname =>
		appPath('/(app)/classes/[classId]/attendance/[[id]]', { classId, id }),
	classTeachingSubject: (classId: string, id: string): ResolvedPathname =>
		appPath('/(app)/classes/[classId]/teaching/[[id]]', { classId, id }),
	classDeadline: (classId: string, id: string): ResolvedPathname =>
		appPath('/(app)/classes/[classId]/evaluations/[[id]]', { classId, id }),
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
