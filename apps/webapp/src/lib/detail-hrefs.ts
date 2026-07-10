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

const STUDENT_TAB_ROUTES: Record<SchoolStudentTabSegment, RouteId> = {
	'profile': '/(app)/school/students/[[id]]/profile',
	'grades': '/(app)/school/students/[[id]]/grades',
	'attendance': '/(app)/school/students/[[id]]/attendance',
	'incidents': '/(app)/school/students/[[id]]/incidents',
	'finances': '/(app)/school/students/[[id]]/finances',
	'report-card': '/(app)/school/students/[[id]]/report-card',
	'enrollments': '/(app)/school/students/[[id]]/enrollments',
};

export const detailHref = {
	schoolStudent: (id: string): ResolvedPathname => appPath('/(app)/school/students/[[id]]/profile', { id }),
	schoolStudentTab: (id: string, tab: SchoolStudentTabSegment = 'profile'): ResolvedPathname =>
		appPath(STUDENT_TAB_ROUTES[tab], { id }),
	schoolGuardian: (id: string): ResolvedPathname => appPath('/(app)/school/guardians/[[id]]', { id }),
	schoolTeacher: (id: string): ResolvedPathname => appPath('/(app)/school/teachers/[[id]]', { id }),
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
	configStaffGuardian: (id: string): ResolvedPathname => appPath('/(app)/school/staff/[[id]]', { id }),
	configStaffMember: (id: string): ResolvedPathname => appPath('/(app)/school/staff/[[id]]', { id }),
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
