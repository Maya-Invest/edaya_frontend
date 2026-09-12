import type { PermissionCatalogEntry } from '$lib/api/staff-permission-assignments-data';

export type StaffAssignmentTargetKind = 'class_group' | 'class_subject';

/** Assignment placements support class and subject scopes. The action stays on the assignment. */
export function catalogEntriesForStaffAssignmentTarget(
	catalog: readonly PermissionCatalogEntry[],
	_targetKind: StaffAssignmentTargetKind,
): PermissionCatalogEntry[] {
	return catalog.filter(entry => entry.scope === 'class_group' || entry.scope === 'class_subject');
}

export function catalogEntriesForClassGroupStaffAssignment(catalog: readonly PermissionCatalogEntry[]): PermissionCatalogEntry[] {
	return catalogEntriesForStaffAssignmentTarget(catalog, 'class_group');
}

export function catalogEntriesForClassSubjectStaffAssignment(catalog: readonly PermissionCatalogEntry[]): PermissionCatalogEntry[] {
	return catalogEntriesForStaffAssignmentTarget(catalog, 'class_subject');
}
