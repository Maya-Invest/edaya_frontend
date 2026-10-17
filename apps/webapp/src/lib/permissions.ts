import type { PermissionCode } from '$lib/auth/types';
import type { PermissionContext } from '$lib/permission-check';
import type { StaffMember, StaffRole } from '$lib/types/school';
import { academicContext } from '$lib/academic/context.svelte';
import { authSession } from '$lib/auth/session.svelte';
import { checkAnyPermission, checkPermission } from '$lib/permission-check';

type Ctx = Omit<PermissionContext, 'schoolId' | 'academicYearId'>;

const P = {
	GRADE_READ: 'GRADE_READ',
	GRADE_MANAGE: 'GRADE_MANAGE',
	DISCIPLINE_CREATE: 'DISCIPLINE_CREATE',
	DISCIPLINE_MANAGE: 'DISCIPLINE_MANAGE',
	ATTENDANCE_RECORD: 'ATTENDANCE_RECORD',
	CLASS_LOGBOOK_MANAGE: 'CLASS_LOGBOOK_MANAGE',
	REPORT_CARD_CONFIGURE: 'REPORT_CARD_CONFIGURE',
	REPORT_CARD_GENERATE: 'REPORT_CARD_GENERATE',
	TIMETABLE_MANAGE: 'TIMETABLE_MANAGE',
} as const satisfies Record<string, PermissionCode>;

function sessionContext(ctx: Ctx = {}): PermissionContext {
	return {
		...ctx,
		gradeLevelId: ctx.gradeLevelId ?? academicContext.classes.find(group => group.id === ctx.classId)?.gradeLevelId,
		schoolId: authSession.schoolId ?? '',
		academicYearId: academicContext.yearId,
	};
}

export function hasPermission(permission: PermissionCode, ctx: Ctx = {}): boolean {
	return checkPermission(authSession.grants, permission, sessionContext(ctx));
}

export function hasAnyPermission(permissions: readonly PermissionCode[], ctx: Ctx = {}): boolean {
	return checkAnyPermission(authSession.grants, permissions, sessionContext(ctx));
}

export function canUploadProfilePhoto(updatePermission: PermissionCode): boolean {
	return hasPermission(updatePermission);
}

export function getCurrentUser(): StaffMember | null {
	return authSession.user;
}

export function getCurrentRole(): StaffRole {
	return getCurrentUser()?.role ?? 'staff';
}

export function canEditGrades(ctx: Ctx = {}): boolean {
	return hasPermission(P.GRADE_MANAGE, ctx);
}

export function canViewGrades(_ctx: Ctx = {}): boolean {
	return hasPermission(P.GRADE_READ);
}

export function canEditSchoolLife(_ctx: Ctx = {}): boolean {
	return hasAnyPermission([
		P.DISCIPLINE_CREATE,
		P.DISCIPLINE_MANAGE,
		P.ATTENDANCE_RECORD,
		P.CLASS_LOGBOOK_MANAGE,
	]);
}

export function canEditReportsAndOrientation(ctx: Ctx = {}): boolean {
	return hasAnyPermission([P.REPORT_CARD_CONFIGURE, P.REPORT_CARD_GENERATE], ctx);
}

export function canEditTimetable(ctx: Ctx = {}): boolean {
	return hasPermission(P.TIMETABLE_MANAGE, ctx);
}

export const ROLE_LABEL_FR: Record<StaffRole, string> = {
	owner: 'Propriétaire',
	directeur: 'Directeur',
	deputy_director: 'Directeur adjoint',
	studies_director: 'Directeur d\'études',
	educateur: 'Éducateur',
	cpe: 'CPE / Vie scolaire',
	secretary: 'Secrétaire',
	accountant: 'Comptable',
	it_admin: 'Informaticien',
	staff: 'Personnel',
};

export const ROLE_LABEL_EN: Record<StaffRole, string> = {
	owner: 'Owner',
	directeur: 'Principal',
	deputy_director: 'Deputy director',
	studies_director: 'Director of studies',
	educateur: 'Educator',
	cpe: 'Pastoral / Student life',
	secretary: 'Secretary',
	accountant: 'Accountant',
	it_admin: 'IT administrator',
	staff: 'Staff',
};
