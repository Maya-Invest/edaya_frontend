import type { ResolvedPathname } from '$app/types';
import type { StaffRole } from '$lib/types/school';
import { appPath } from '$lib/navigation/app-navigation';

export const detailHref = {
	schoolStudent: (id: string): ResolvedPathname => appPath('/(app)/school/students/[[id]]', { id }),
	schoolGuardian: (id: string): ResolvedPathname => appPath('/(app)/school/guardians/[[id]]', { id }),
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
	classTeachingSubject: (classId: string, id: string): ResolvedPathname =>
		appPath('/(app)/classes/[classId]/teaching/[[id]]', { classId, id }),
	classDeadline: (classId: string, id: string): ResolvedPathname =>
		appPath('/(app)/classes/[classId]/homework/[[id]]', { classId, id }),
	configSubject: (id: string): ResolvedPathname => appPath('/(app)/configuration/subjects/[[id]]', { id }),
	configSubjectLevel: (label: string): ResolvedPathname =>
		appPath('/(app)/configuration/subjects/level/[[level]]', { level: label }),
	configStaffGuardian: (id: string): ResolvedPathname => appPath('/(app)/school/staff/[[id]]', { id }),
	configStaffMember: (id: string): ResolvedPathname => appPath('/(app)/school/staff/[[id]]', { id }),
	configRole: (role: StaffRole): ResolvedPathname => appPath('/(app)/configuration/roles/[[role]]', { role }),
	configStaffPermissions: (staffId: string): ResolvedPathname =>
		appPath('/(app)/configuration/roles/[[role]]', { role: staffId }),
	configReportCard: (id: string): ResolvedPathname => appPath('/(app)/configuration/report-cards/[[id]]', { id }),
	financeBilling: (id: string): ResolvedPathname => appPath('/(app)/finance/billing/[[id]]', { id }),
	financeFee: (id: string): ResolvedPathname => appPath('/(app)/finance/fees/[[id]]', { id }),
	classReportCard: (classId: string, id: string): ResolvedPathname =>
		appPath('/(app)/classes/[classId]/report-cards/[[id]]', { classId, id }),
	accountInbox: (id?: string): ResolvedPathname =>
		appPath('/(app)/account/inbox/[[id]]', id ? { id } : {}),
	accountNotifications: (): ResolvedPathname => appPath('/(app)/account/notifications'),
};
