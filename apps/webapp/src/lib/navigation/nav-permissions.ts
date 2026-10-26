import type { ActionGrantsSnapshot, PermissionCode } from '$lib/auth/types';
import type { NavItemDefinition, NavModuleKey } from '$lib/navigation/nav-catalog';
import {
	NAV_MODULE_DEFS,

} from '$lib/navigation/nav-catalog';
import { checkAnyPermission } from '$lib/permission-check';

export interface NavPermissionContext {
	classId?: string;
	schoolId?: string;
}

const MODULE_ORDER: NavModuleKey[] = ['inbox', 'school', 'classes', 'finance', 'configuration'];

function resolveNavContext(ctx: NavPermissionContext = {}) {
	return {
		classId: ctx.classId,
		schoolId: ctx.schoolId ?? '',
	};
}

export function canAccessNavItem(
	item: Pick<NavItemDefinition, 'permissions'>,
	grants: ActionGrantsSnapshot | null,
	ctx: NavPermissionContext = {},
): boolean {
	if (!item.permissions?.length) {
		return true;
	}
	return checkAnyPermission(grants, item.permissions, resolveNavContext(ctx));
}

export function filterNavItems<T extends Pick<NavItemDefinition, 'permissions'>>(
	items: readonly T[],
	grants: ActionGrantsSnapshot | null,
	ctx: NavPermissionContext = {},
): T[] {
	return items.filter(item => canAccessNavItem(item, grants, ctx));
}

export function visibleNavModuleKeys(
	grants: ActionGrantsSnapshot | null,
	ctx: NavPermissionContext = {},
): NavModuleKey[] {
	const schoolCtx = { schoolId: ctx.schoolId };
	return MODULE_ORDER.filter((moduleKey) => {
		return filterNavItems(NAV_MODULE_DEFS[moduleKey], grants, schoolCtx).length > 0;
	});
}

function resolveItemHref(item: NavItemDefinition, classId: string): string {
	if (item.classSegment) {
		return `/classes/${classId}/${item.href}`;
	}
	return item.href;
}

function pathnameMatchesItem(pathname: string, href: string): boolean {
	return pathname === href || pathname.startsWith(`${href}/`);
}

export function findNavItemForPath(pathname: string, classId?: string): NavItemDefinition | null {
	if (pathname.replace(/\/$/, '') === '/configuration/other/grade-scales')
		pathname = '/configuration/grade-scales';
	if (pathname === '/dashboard' || pathname.startsWith('/dashboard/') || pathname.startsWith('/account')) {
		return null;
	}

	for (const moduleKey of MODULE_ORDER) {
		for (const item of NAV_MODULE_DEFS[moduleKey]) {
			const href = moduleKey === 'classes' && classId
				? resolveItemHref(item, classId)
				: item.href;
			if (pathnameMatchesItem(pathname, href)) {
				return item;
			}
		}
	}

	return null;
}

export function canAccessPath(
	pathname: string,
	grants: ActionGrantsSnapshot | null,
	ctx: NavPermissionContext = {},
): boolean {
	if (pathname === '/configuration/tools/finance-checks' || pathname === '/finance/reconciliation') {
		return canAccessNavItem({ permissions: ['FINANCIAL_REPORT_READ'] }, grants, ctx);
	}

	if (pathname === '/dashboard' || pathname.startsWith('/dashboard/') || pathname.startsWith('/account')) {
		return true;
	}

	if (/^\/configuration\/(?:report-cards|structure\/details\/report-cards)(?:\/|$)/.test(pathname)) {
		return canAccessNavItem({ permissions: ['REPORT_CARD_CONFIGURE'] }, grants, ctx);
	}

	const classId = ctx.classId ?? extractClassIdFromPath(pathname);
	const item = findNavItemForPath(pathname, classId);
	if (!item) {
		return true;
	}

	const itemCtx = pathname.startsWith('/classes/') && classId
		? { schoolId: ctx.schoolId }
		: { schoolId: ctx.schoolId };
	return canAccessNavItem(item, grants, itemCtx);
}

function extractClassIdFromPath(pathname: string): string | undefined {
	const match = /^\/classes\/([^/]+)/.exec(pathname);
	return match?.[1];
}

/** Staff teaching-write permissions — used in unit tests for profile 3.2. */
export const TEACHER_NAV_PERMISSIONS: readonly PermissionCode[] = [
	'ACTIVITY_READ',
	'CLASS_LOGBOOK_MANAGE',
	'ATTENDANCE_RECORD',
	'DISCIPLINE_CREATE',
	'GRADE_MANAGE',
	'CLASS_LOGBOOK_MANAGE',
	'GRADE_READ',
	'WORKSPACE_ACCESS',
	'CLASS_READ',
	'ENROLLMENT_READ',
	'ACADEMIC_PROGRAM_READ',
	'WORKSPACE_ACCESS',
	'OVERDUE_BALANCE_READ',
	'STUDENT_READ',
	'PARENT_READ',
	'STUDENT_READ',
	'PARENT_READ',
	'TIMETABLE_READ',
	'RESOURCE_READ',
	'TIMETABLE_READ',
	'ATTENDANCE_READ',
	'ATTENDANCE_READ',
	'DISCIPLINE_READ',
	'STUDENT_READ',
	'CLASS_LOGBOOK_READ',
	'STUDENT_HEALTH_READ',
	'REPORT_CARD_READ',
];

/** Dev seed `role-coordinator` permissions — used in unit tests for profile 3.3. */
export const COORDINATOR_NAV_PERMISSIONS: readonly PermissionCode[] = [
	'ACTIVITY_READ',
	'ACADEMIC_CATALOG_READ',
	'ACADEMIC_CATALOG_MANAGE',
	'GRADE_SCALE_CONFIGURE',
	'REPORT_CARD_REVIEW_COMMENTS',
	'REPORT_CARD_EXPORT',
	'ACADEMIC_PROGRAM_MANAGE',
	'SCHOOL_LIFECYCLE_MANAGE',
	'CLASS_LOGBOOK_MANAGE',
	'CLASS_LOGBOOK_READ',
	'TIMETABLE_MANAGE',
	'ATTENDANCE_RECORD',
	'ATTENDANCE_MANAGE',
	'ATTENDANCE_READ',
	'DISCIPLINE_CREATE',
	'DISCIPLINE_VALIDATE',
	'DISCIPLINE_READ',
	'RESOURCE_CONFIGURE',
	'RESOURCE_READ',
	'ATTACHMENT_CONFIGURE',
	'ATTACHMENT_READ',
	'ASSESSMENT_MANAGE',
	'GRADE_MANAGE',
	'GRADE_READ',
	'REPORT_CARD_PUBLISH',
	'ENROLLMENT_MANAGE',
	'PARENT_MANAGE',
	'STUDENT_MANAGE',
	'STUDENT_HEALTH_READ',
	'STUDENT_HEALTH_UPDATE',
	'CLASS_LOGBOOK_MANAGE',
	'COMMUNICATION_DRAFT_MANAGE',
	'WORKSPACE_ACCESS',
	'STUDENT_READ',
	'ENROLLMENT_READ',
	'REPORT_CARD_READ',
	'PERSONAL_COMMUNICATIONS_READ',
	'TIMETABLE_READ',
	'CLASS_LOGBOOK_READ',
	'CLASS_READ',
	'ACADEMIC_PROGRAM_READ',
	'TIMETABLE_READ',
	'ATTENDANCE_READ',
	'PARENT_READ',
	'TIMETABLE_MANAGE',
	'SCHOOL_CONFIGURE',
	'REPORT_CARD_CONFIGURE',
	'REPORT_CARD_GENERATE',
	'STUDENT_READ',
	'WORKSPACE_ACCESS',
	'ACCESS_CONTROL_READ',
	'STAFF_READ',
];

/** Dev seed `role-educator` permissions — used in unit tests for profile 3.4. */
export const EDUCATOR_NAV_PERMISSIONS: readonly PermissionCode[] = [
	'DISCIPLINE_READ',
	'DISCIPLINE_CREATE',
	'DISCIPLINE_MANAGE',
	'ATTENDANCE_READ',
	'ATTENDANCE_RECORD',
	'ATTENDANCE_MANAGE',
	'CLASS_LOGBOOK_READ',
	'GRADE_READ',
	'STUDENT_READ',
	'WORKSPACE_ACCESS',
	'CLASS_READ',
	'ENROLLMENT_READ',
	'ACADEMIC_PROGRAM_READ',
	'WORKSPACE_ACCESS',
	'OVERDUE_BALANCE_READ',
	'STUDENT_READ',
	'PARENT_READ',
	'STUDENT_READ',
	'STUDENT_HEALTH_READ',
	'REPORT_CARD_READ',
];
