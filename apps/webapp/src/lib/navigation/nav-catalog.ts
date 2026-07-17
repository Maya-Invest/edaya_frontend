import type { PermissionCode } from '$lib/auth/types';

export interface NavItemDefinition {
	key: string;
	labelKey: string;
	/** Resolved app path, or class segment when `classSegment` is true. */
	href: string;
	classSegment?: boolean;
	permissions?: PermissionCode[];
}

export const SCHOOL_NAV_DEFS: NavItemDefinition[] = [
	{
		key: 'students',
		labelKey: 'school.students',
		href: '/school/students',
		permissions: ['QUERY_STUDENT_DIRECTORY_READ', 'STUDENT_READ'],
	},
	{
		key: 'guardians',
		labelKey: 'school.guardians',
		href: '/school/guardians',
		permissions: ['QUERY_GUARDIAN_STUDENTS_ADMIN_READ', 'PARENT_READ'],
	},
	{
		key: 'staff',
		labelKey: 'config.staff',
		href: '/school/staff',
		permissions: ['STAFF_READ'],
	},
	{
		key: 'teachers',
		labelKey: 'school.teachers',
		href: '/school/teachers',
		permissions: ['STAFF_READ'],
	},
	{
		key: 'calendar',
		labelKey: 'school.calendar',
		href: '/school/calendar',
		permissions: ['QUERY_CALENDAR_READ', 'ACCESS_CONTROL_READ'],
	},
	{
		key: 'timetablePlanning',
		labelKey: 'school.timetablePlanning',
		href: '/school/timetable-planning',
		permissions: ['QUERY_TIMETABLE_READ'],
	},
	{
		key: 'activities',
		labelKey: 'school.activities',
		href: '/school/activities',
		permissions: ['QUERY_CALENDAR_READ', 'ACCESS_CONTROL_READ'],
	},
	{
		key: 'announcements',
		labelKey: 'school.announcements',
		href: '/school/announcements',
		permissions: ['QUERY_COMMUNICATIONS_READ', 'COMMUNICATION_READ'],
	},
	{
		key: 'events',
		labelKey: 'school.events',
		href: '/school/events',
		permissions: ['DISCIPLINE_READ'],
	},
];

export const CLASS_NAV_DEFS: NavItemDefinition[] = [
	{
		key: 'students',
		labelKey: 'tab.students',
		href: 'students',
		classSegment: true,
		permissions: ['QUERY_CLASS_DIRECTORY_READ', 'QUERY_STUDENT_DIRECTORY_READ'],
	},
	{
		key: 'timetable',
		labelKey: 'tab.timetable',
		href: 'timetable',
		classSegment: true,
		permissions: ['QUERY_TIMETABLE_READ'],
	},
	{
		key: 'teaching',
		labelKey: 'tab.teaching',
		href: 'teaching',
		classSegment: true,
		permissions: ['QUERY_CLASS_CURRICULUM_READ', 'QUERY_CURRICULUM_PROGRESS_READ'],
	},
	{
		key: 'evaluations',
		labelKey: 'tab.evaluations',
		href: 'evaluations',
		classSegment: true,
		permissions: ['GRADE_READ', 'GRADE_INPUT'],
	},
	{
		key: 'attendance',
		labelKey: 'tab.attendance',
		href: 'attendance',
		classSegment: true,
		permissions: ['QUERY_ATTENDANCE_READ', 'ATTENDANCE_READ'],
	},
	{
		key: 'reportCards',
		labelKey: 'tab.reportCards',
		href: 'report-cards',
		classSegment: true,
		permissions: ['QUERY_REPORT_CARD_DETAIL_READ', 'REPORT_CARD_READ'],
	},
];

export const FINANCE_NAV_DEFS: NavItemDefinition[] = [
	{
		key: 'fees',
		labelKey: 'finance.fees',
		href: '/finance/fees',
		permissions: ['FINANCIAL_CONFIG_READ'],
	},
	{
		key: 'billing',
		labelKey: 'finance.billing',
		href: '/finance/billing',
		permissions: ['FINANCIAL_CONFIG_READ', 'PAYMENT_READ'],
	},
	{
		key: 'payment',
		labelKey: 'finance.payment',
		href: '/finance/payment',
		permissions: ['PAYMENT_READ', 'FINANCIAL_CONFIG_READ'],
	},
];

export const CONFIG_NAV_DEFS: NavItemDefinition[] = [
	{
		key: 'school',
		labelKey: 'config.school',
		href: '/configuration/school',
		permissions: ['SCHOOL_LIFECYCLE_MANAGE', 'SCHOOL_STRUCTURE_READ'],
	},
	{
		key: 'academic',
		labelKey: 'config.academic',
		href: '/configuration/academic',
		permissions: ['ACADEMIC_PROGRAM_READ', 'ACADEMIC_PROGRAM_UPDATE', 'SCHOOL_STRUCTURE_READ'],
	},
	{
		key: 'gradeLevels',
		labelKey: 'config.gradeLevels',
		href: '/configuration/grade-levels',
		permissions: ['SCHOOL_STRUCTURE_CONFIGURE', 'SCHOOL_STRUCTURE_READ'],
	},
	{
		key: 'classGroups',
		labelKey: 'config.classGroups',
		href: '/configuration/classes',
		permissions: ['SCHOOL_STRUCTURE_CONFIGURE', 'SCHOOL_STRUCTURE_READ'],
	},
	{
		key: 'subjects',
		labelKey: 'config.subjects',
		href: '/configuration/subjects',
		permissions: ['ACADEMIC_PROGRAM_READ', 'ACADEMIC_PROGRAM_UPDATE'],
	},
	{
		key: 'gradeScales',
		labelKey: 'config.gradeScales',
		href: '/configuration/grade-scales',
		permissions: ['REPORT_CARD_CONFIGURE', 'EXAM_CONFIG_READ', 'EXAM_CONFIG_CONFIGURE'],
	},
	{
		key: 'reportCards',
		labelKey: 'config.reportCards',
		href: '/configuration/report-cards',
		permissions: ['REPORT_CARD_CONFIGURE'],
	},
	{
		key: 'notificationTemplates',
		labelKey: 'config.notificationTemplates',
		href: '/configuration/notifications',
		permissions: ['SCHOOL_LIFECYCLE_MANAGE'],
	},
	{
		key: 'discipline',
		labelKey: 'config.discipline',
		href: '/configuration/discipline',
		permissions: ['DISCIPLINE_VALIDATE'],
	},
	{
		key: 'import',
		labelKey: 'config.import',
		href: '/configuration/import',
		permissions: ['STUDENT_CREATE', 'SCHOOL_STRUCTURE_READ'],
	},
];

export type NavModuleKey = 'school' | 'classes' | 'finance' | 'configuration';

export const NAV_MODULE_DEFS: Record<NavModuleKey, NavItemDefinition[]> = {
	school: SCHOOL_NAV_DEFS,
	classes: CLASS_NAV_DEFS,
	finance: FINANCE_NAV_DEFS,
	configuration: CONFIG_NAV_DEFS,
};
