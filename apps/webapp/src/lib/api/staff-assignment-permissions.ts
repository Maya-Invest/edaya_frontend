import type { ScopeGrain } from '$lib/api/scope-ids';
import type { PermissionCatalogEntry } from '$lib/api/staff-permission-assignments-data';
import { catalogScopeIncludesClassGroupInPath } from '$lib/api/scope-ids';

export type StaffAssignmentTargetKind = 'class_group' | 'class_subject';

type AssignmentPermission = PermissionCatalogEntry['permission'];

/**
 * Teaching permissions synced from class-subject `StaffAssignment` rows.
 * Keep aligned with `@edaya/core` `ASSIGNMENT_SCOPED_PERMISSIONS`.
 */
export const STAFF_ASSIGNMENT_SYNC_PERMISSIONS = [
	'GRADE_INPUT',
	'ATTENDANCE_RECORD',
	'CLASS_LOGBOOK_CREATE',
	'CLASS_LOGBOOK_UPDATE',
	'DISCIPLINE_CREATE',
] as const satisfies readonly AssignmentPermission[];

const STAFF_ASSIGNMENT_SYNC_PERMISSION_SET = new Set<string>(STAFF_ASSIGNMENT_SYNC_PERMISSIONS);

/** Mirrors backend `TARGET_ALLOWED_SCOPES` in staff-assignment-permission-rules. */
const TARGET_ALLOWED_SCOPES: Record<StaffAssignmentTargetKind, readonly ScopeGrain[]> = {
	class_group: ['class_group', 'class_subject'],
	class_subject: ['class_subject'],
};

function isScopeGrain(scope: NonNullable<PermissionCatalogEntry['scope']>): scope is ScopeGrain {
	return scope !== 'platform';
}

function catalogEntryAllowedForClassGroupAssignment(entry: PermissionCatalogEntry): boolean {
	const scope = entry.scope;
	if (!scope || !isScopeGrain(scope) || !TARGET_ALLOWED_SCOPES.class_group.includes(scope)) {
		return false;
	}
	return catalogScopeIncludesClassGroupInPath(scope);
}

function catalogEntryAllowedForClassSubjectAssignment(entry: PermissionCatalogEntry): boolean {
	if (!STAFF_ASSIGNMENT_SYNC_PERMISSION_SET.has(entry.permission)) {
		return false;
	}
	const scope = entry.scope;
	return scope === 'class_subject';
}

function catalogEntryAllowedForStaffAssignmentTarget(
	entry: PermissionCatalogEntry,
	targetKind: StaffAssignmentTargetKind,
): boolean {
	if (targetKind === 'class_group') {
		return catalogEntryAllowedForClassGroupAssignment(entry);
	}
	return catalogEntryAllowedForClassSubjectAssignment(entry);
}

/** Permissions that may be selected on a staff assignment form for the given target. */
export function catalogEntriesForStaffAssignmentTarget(
	catalog: readonly PermissionCatalogEntry[],
	targetKind: StaffAssignmentTargetKind,
): PermissionCatalogEntry[] {
	return catalog.filter(entry => catalogEntryAllowedForStaffAssignmentTarget(entry, targetKind));
}

/** Class-level configuration assignments (`classGroupId` only). */
export function catalogEntriesForClassGroupStaffAssignment(
	catalog: readonly PermissionCatalogEntry[],
): PermissionCatalogEntry[] {
	return catalogEntriesForStaffAssignmentTarget(catalog, 'class_group');
}

/** Class-subject teaching assignments (`classSubjectId` target). */
export function catalogEntriesForClassSubjectStaffAssignment(
	catalog: readonly PermissionCatalogEntry[],
): PermissionCatalogEntry[] {
	return catalogEntriesForStaffAssignmentTarget(catalog, 'class_subject');
}
