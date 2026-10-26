import type { PermissionCode } from '$lib/auth/types';
import {
	FAMILY_FEEDBACK_CAMPAIGN_MANAGE_PERMISSION,
	FAMILY_FEEDBACK_CAMPAIGN_READ_PERMISSION,
	FAMILY_FEEDBACK_PUBLISH_PERMISSION,
} from '$lib/family-feedback/permissions';
import { FINANCIAL_REPORT_READ_PERMISSION } from '$lib/finance/permissions';

export interface NavItemDefinition {
	key: string;
	labelKey: string;
	/** Resolved app path, or class segment when `classSegment` is true. */
	href: string;
	classSegment?: boolean;
	permissions?: PermissionCode[];
}

export const INBOX_NAV_DEFS: NavItemDefinition[] = [
	{ key: 'personal', labelKey: 'inbox.personal', href: '/account/inbox' },
	{ key: 'messages', labelKey: 'inbox.school', href: '/school/messages', permissions: ['SCHOOL_MESSAGES_READ', 'TEACHER_MESSAGES_REVIEW'] },
	{ key: 'marksReview', labelKey: 'corrections.title', href: '/school/corrections', permissions: ['GRADE_VALIDATE', 'ATTENDANCE_VALIDATE', 'CLASS_LOGBOOK_VALIDATE', 'DISCIPLINE_VALIDATE', 'REPORT_CARD_REVIEW_COMMENTS', 'REPORT_CARD_PUBLISH'] },
];

export const SCHOOL_NAV_DEFS: NavItemDefinition[] = [
	{
		key: 'students',
		labelKey: 'school.students',
		href: '/school/students',
		permissions: ['STUDENT_READ', 'STUDENT_READ'],
	},
	{
		key: 'guardians',
		labelKey: 'school.guardians',
		href: '/school/guardians',
		permissions: ['PARENT_READ', 'PARENT_READ'],
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
		permissions: ['TIMETABLE_READ'],
	},
	{
		key: 'activities',
		labelKey: 'school.activities',
		href: '/school/activities',
		permissions: ['ACTIVITY_READ'],
	},
	{
		key: 'announcements',
		labelKey: 'school.announcements',
		href: '/school/announcements',
		// Every selected profile may read announcements addressed to it; policies filter the rows.
	},
	{
		key: 'familyFeedback',
		labelKey: 'school.familyFeedback',
		href: '/school/family-feedback',
		permissions: [
			FAMILY_FEEDBACK_CAMPAIGN_READ_PERMISSION,
			FAMILY_FEEDBACK_CAMPAIGN_MANAGE_PERMISSION,
			FAMILY_FEEDBACK_PUBLISH_PERMISSION,
		],
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
		permissions: ['CLASS_READ', 'STUDENT_READ'],
	},
	{
		key: 'timetable',
		labelKey: 'tab.timetable',
		href: 'timetable',
		classSegment: true,
		permissions: ['TIMETABLE_READ'],
	},
	{
		key: 'teaching',
		labelKey: 'tab.teaching',
		href: 'teaching',
		classSegment: true,
		permissions: ['ACADEMIC_PROGRAM_READ', 'CLASS_LOGBOOK_READ'],
	},
	{
		key: 'evaluations',
		labelKey: 'tab.evaluations',
		href: 'evaluations',
		classSegment: true,
		permissions: ['ASSESSMENT_READ', 'ASSESSMENT_MANAGE', 'GRADE_READ', 'GRADE_MANAGE'],
	},
	{
		key: 'attendance',
		labelKey: 'tab.attendance',
		href: 'attendance',
		classSegment: true,
		permissions: ['ATTENDANCE_READ', 'ATTENDANCE_READ'],
	},
	{
		key: 'reportCards',
		labelKey: 'tab.reportCards',
		href: 'report-cards',
		classSegment: true,
		permissions: ['REPORT_CARD_READ', 'REPORT_CARD_READ'],
	},
];

export const FINANCE_NAV_DEFS: NavItemDefinition[] = [
	{ key: 'fees', labelKey: 'finance.fees', href: '/finance/fees', permissions: ['FINANCIAL_CONFIG_READ', 'PAYMENT_READ'] },
	{ key: 'billing', labelKey: 'finance.billing', href: '/finance/billing', permissions: ['PAYMENT_READ'] },
	{ key: 'payment', labelKey: 'finance.payment', href: '/finance/payment', permissions: ['PAYMENT_READ'] },
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
		permissions: ['ACADEMIC_CATALOG_READ', 'ACADEMIC_CATALOG_MANAGE'],
	},
	{
		key: 'periodGrid',
		labelKey: 'config.periodGrid',
		href: '/configuration/period-grid',
		permissions: ['SCHOOL_STRUCTURE_READ', 'SCHOOL_CONFIGURE'],
	},
	{
		key: 'gradeScales',
		labelKey: 'config.gradeScales',
		href: '/configuration/grade-scales',
		permissions: ['GRADE_SCALE_CONFIGURE', 'REPORT_CARD_CONFIGURE'],
	},
	{
		key: 'structure',
		labelKey: 'config.structure',
		href: '/configuration/structure',
		permissions: ['SCHOOL_CONFIGURE', 'SCHOOL_STRUCTURE_READ', 'ACADEMIC_CATALOG_READ', 'ACADEMIC_CATALOG_MANAGE', 'REPORT_CARD_CONFIGURE'],
	},
	{
		key: 'notificationTemplates',
		labelKey: 'config.notificationTemplates',
		href: '/configuration/notifications',
		permissions: ['SCHOOL_LIFECYCLE_MANAGE'],
	},
	{
		key: 'other',
		labelKey: 'config.other',
		href: '/configuration/other',
		permissions: [
			'DISCIPLINE_VALIDATE',
			'ACADEMIC_CATALOG_READ',
			'ACADEMIC_CATALOG_MANAGE',
		],
	},
	{
		key: 'permissionProfiles',
		labelKey: 'config.permissionProfiles',
		href: '/configuration/permission-profiles',
		permissions: ['ACCESS_CONTROL_READ', 'ACCESS_CONTROL_MANAGE'],
	},
	{
		key: 'tools',
		labelKey: 'config.tools',
		href: '/configuration/tools',
		permissions: ['STUDENT_CREATE', 'SCHOOL_STRUCTURE_READ', FINANCIAL_REPORT_READ_PERMISSION],
	},
];

export type NavModuleKey = 'inbox' | 'school' | 'classes' | 'finance' | 'configuration';

export const NAV_MODULE_DEFS: Record<NavModuleKey, NavItemDefinition[]> = {
	inbox: INBOX_NAV_DEFS,
	school: SCHOOL_NAV_DEFS,
	classes: CLASS_NAV_DEFS,
	finance: FINANCE_NAV_DEFS,
	configuration: CONFIG_NAV_DEFS,
};
