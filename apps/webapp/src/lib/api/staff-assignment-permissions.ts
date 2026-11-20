import type { PermissionCatalogEntry } from '$lib/api/staff-permission-assignments-data';

export type StaffAssignmentTargetKind = PermissionCatalogEntry['assignmentTargets'][number];

/** Assignment eligibility comes from the canonical catalog. The action stays on the assignment. */
export function catalogEntriesForStaffAssignmentTarget(
	catalog: readonly PermissionCatalogEntry[],
	targetKind: StaffAssignmentTargetKind,
): PermissionCatalogEntry[] {
	return catalog.filter(entry => entry.staffAssignable && entry.assignmentTargets.includes(targetKind));
}

export function catalogEntriesForClassGroupStaffAssignment(catalog: readonly PermissionCatalogEntry[]): PermissionCatalogEntry[] {
	return catalogEntriesForStaffAssignmentTarget(catalog, 'class_group');
}

export function catalogEntriesForClassSubjectStaffAssignment(catalog: readonly PermissionCatalogEntry[]): PermissionCatalogEntry[] {
	return catalogEntriesForStaffAssignmentTarget(catalog, 'class_subject');
}
