import type { PermissionCode } from '$lib/auth/types';
import type { PermissionContext } from '$lib/permission-check';
import type { StaffMember, StaffRole } from '$lib/types/school';
import { authSession } from '$lib/auth/session.svelte';
import { checkAnyPermission, checkPermission } from '$lib/permission-check';

interface Ctx { classId?: string; subject?: string }

const P = {
	GRADE_READ: 'GRADE_READ',
	GRADE_INPUT: 'GRADE_INPUT',
	DISCIPLINE_CREATE: 'DISCIPLINE_CREATE',
	DISCIPLINE_UPDATE: 'DISCIPLINE_UPDATE',
	ATTENDANCE_RECORD: 'ATTENDANCE_RECORD',
	CLASS_LOGBOOK_CREATE: 'CLASS_LOGBOOK_CREATE',
	REPORT_CARD_CONFIGURE: 'REPORT_CARD_CONFIGURE',
	REPORT_CARD_GENERATE: 'REPORT_CARD_GENERATE',
	TIMETABLE_UPDATE: 'TIMETABLE_UPDATE',
} as const satisfies Record<string, PermissionCode>;

function sessionContext(ctx: Ctx = {}): PermissionContext {
	return {
		...ctx,
		schoolId: authSession.schoolId ?? '',
	};
}

export function hasPermission(permission: PermissionCode, ctx: Ctx = {}): boolean {
	return checkPermission(authSession.grants, permission, sessionContext(ctx));
}

export function hasAnyPermission(permissions: readonly PermissionCode[], ctx: Ctx = {}): boolean {
	return checkAnyPermission(authSession.grants, permissions, sessionContext(ctx));
}

export function canUploadProfilePhoto(updatePermission: PermissionCode): boolean {
	return hasPermission('ATTACHMENT_CONFIGURE') && hasPermission(updatePermission);
}

export function getCurrentUser(): StaffMember | null {
	return authSession.user;
}

export function getCurrentRole(): StaffRole {
	return getCurrentUser()?.role ?? 'professeur';
}

export function canEditGrades(ctx: Ctx = {}): boolean {
	return hasPermission(P.GRADE_INPUT, ctx);
}

export function canViewGrades(_ctx: Ctx = {}): boolean {
	return hasPermission(P.GRADE_READ);
}

export function canEditSchoolLife(_ctx: Ctx = {}): boolean {
	return hasAnyPermission([
		P.DISCIPLINE_CREATE,
		P.DISCIPLINE_UPDATE,
		P.ATTENDANCE_RECORD,
		P.CLASS_LOGBOOK_CREATE,
	]);
}

export function canEditReportsAndOrientation(ctx: Ctx = {}): boolean {
	return hasAnyPermission([P.REPORT_CARD_CONFIGURE, P.REPORT_CARD_GENERATE], ctx);
}

export function canEditTimetable(ctx: Ctx = {}): boolean {
	return hasPermission(P.TIMETABLE_UPDATE, ctx);
}

export const ROLE_LABEL_FR: Record<StaffRole, string> = {
	owner: 'Propriétaire',
	directeur: 'Directeur',
	prof_principal: 'Professeur principal',
	professeur: 'Professeur',
	educateur: 'Éducateur',
};

export const ROLE_LABEL_EN: Record<StaffRole, string> = {
	owner: 'Owner',
	directeur: 'Principal',
	prof_principal: 'Lead teacher',
	professeur: 'Teacher',
	educateur: 'Educator',
};
