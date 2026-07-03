import type { PermissionCatalogEntry } from '$lib/api/staff-permission-assignments-data';

export type StaffAssignmentTargetKind = 'class_group' | 'class_subject';

const TARGET_ALLOWED_SCOPES: Record<StaffAssignmentTargetKind, readonly (string | undefined)[]> = {
	class_group: ['class_group', 'class_subject'],
	class_subject: ['class_subject'],
};

/** Permissions that may be selected on a staff assignment form for the given target. */
export function catalogEntriesForStaffAssignmentTarget(
	catalog: readonly PermissionCatalogEntry[],
	targetKind: StaffAssignmentTargetKind,
): PermissionCatalogEntry[] {
	const allowedScopes = TARGET_ALLOWED_SCOPES[targetKind];
	return catalog.filter((entry) => {
		const scope = entry.scope;
		if (!scope) {
			return false;
		}
		return allowedScopes.includes(scope);
	});
}
