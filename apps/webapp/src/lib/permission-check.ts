import type { EffectiveGrantsSnapshot, PermissionCode, ScopeGrantSnapshot } from '$lib/auth/types';

export interface PermissionContext {
	classId?: string;
	subject?: string;
	schoolId?: string;
}

function scopeGrantCovers(
	grants: readonly ScopeGrantSnapshot[],
	args: {
		permission: PermissionCode;
		schoolId: string;
		scopeType?: ScopeGrantSnapshot['scopeType'];
		scopeEntityId?: string;
		isElevated: boolean;
	},
): boolean {
	if (args.isElevated) {
		return true;
	}

	if (!args.scopeType) {
		return true;
	}

	const hasSchoolGrant = grants.some(grant =>
		grant.permission === args.permission
		&& grant.scopeType === 'school'
		&& (grant.scopeEntityIds.length === 0 || grant.scopeEntityIds.includes(args.schoolId)),
	);
	if (hasSchoolGrant) {
		return true;
	}

	const matching = grants.filter(grant =>
		grant.permission === args.permission && grant.scopeType === args.scopeType);

	if (matching.length === 0) {
		return false;
	}

	if (!args.scopeEntityId) {
		return true;
	}

	return matching.some(grant => grant.scopeEntityIds.includes(args.scopeEntityId!));
}

export function checkPermission(
	grants: EffectiveGrantsSnapshot | null,
	permission: PermissionCode,
	ctx: PermissionContext = {},
): boolean {
	if (!grants) {
		return false;
	}

	if (grants.isElevated) {
		return true;
	}

	if (!grants.permissions.includes(permission)) {
		return false;
	}

	if (!ctx.classId && !ctx.subject) {
		return true;
	}

	return scopeGrantCovers(grants.scopeGrants, {
		permission,
		schoolId: ctx.schoolId ?? '',
		scopeType: ctx.classId ? 'class_group' : 'course_assignment',
		scopeEntityId: ctx.classId ?? ctx.subject,
		isElevated: grants.isElevated,
	});
}

export function checkAnyPermission(
	grants: EffectiveGrantsSnapshot | null,
	permissions: readonly PermissionCode[],
	ctx: PermissionContext = {},
): boolean {
	return permissions.some(permission => checkPermission(grants, permission, ctx));
}
