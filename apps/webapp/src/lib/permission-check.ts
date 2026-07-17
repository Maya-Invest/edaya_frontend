import type { EffectiveGrantsSnapshot, PermissionCode } from '$lib/auth/types';
import {
	legacyScopeToResourcePath,
	permissionScopeGrain,
	scopePathCovers,
} from '$lib/scope-path-covers';

export interface PermissionContext {
	classId?: string;
	subject?: string;
	schoolId?: string;
}

function scopeIdsCoverPermission(
	grants: EffectiveGrantsSnapshot,
	args: {
		permission: PermissionCode;
		scopeType: 'class_group' | 'course_assignment';
		scopeEntityId: string;
	},
): boolean {
	const scopeIds = grants.scopeIdsByPermission[args.permission];
	if (scopeIds === undefined) {
		return false;
	}

	const permissionScope = permissionScopeGrain(args.permission);
	if (!args.scopeEntityId) {
		return true;
	}

	const resourcePath = legacyScopeToResourcePath(args.scopeType, args.scopeEntityId);
	return scopePathCovers(scopeIds, resourcePath, permissionScope);
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

	return scopeIdsCoverPermission(grants, {
		permission,
		scopeType: ctx.classId ? 'class_group' : 'course_assignment',
		scopeEntityId: ctx.classId ?? ctx.subject ?? '',
	});
}

export function checkAnyPermission(
	grants: EffectiveGrantsSnapshot | null,
	permissions: readonly PermissionCode[],
	ctx: PermissionContext = {},
): boolean {
	return permissions.some(permission => checkPermission(grants, permission, ctx));
}
