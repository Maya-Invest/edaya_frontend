import type { PermissionCatalogEntry } from '$lib/api/staff-permission-assignments-data';
import { permissionSelectionGrains } from '$lib/api/grant-scopes';
import { catalogEntriesForStaffAssignmentTarget } from '$lib/api/staff-assignment-permissions';
import { expect, test } from 'bun:test';

test('assignment eligibility and scope selectors use the canonical metadata', () => {
	const base = { staffAssignable: true, serviceAccountAssignable: true, s2sAccess: 'write' as const, humanOnly: false, minimumAssurance: 'standard' as const };
	const catalog: PermissionCatalogEntry[] = [
		{ ...base, permission: 'STAFF_READ', scopePolicy: { mode: 'none' }, assignmentTargets: [] },
		{ ...base, permission: 'GRADE_MANAGE', scopePolicy: { mode: 'resources', allowedKinds: ['grade_level', 'class_group', 'class_subject'], allowAll: true }, assignmentTargets: ['class_group', 'class_subject', 'assessment'] },
		{ ...base, permission: 'STUDENT_READ', scopePolicy: { mode: 'resources', allowedKinds: ['student', 'class_group'], allowAll: true }, assignmentTargets: ['class_group'] },
	];
	expect(catalogEntriesForStaffAssignmentTarget(catalog, 'class_group').map(entry => entry.permission)).toEqual(['GRADE_MANAGE', 'STUDENT_READ']);
	expect(catalogEntriesForStaffAssignmentTarget(catalog, 'class_subject').map(entry => entry.permission)).toEqual(['GRADE_MANAGE']);
	expect(catalogEntriesForStaffAssignmentTarget(catalog, 'assessment').map(entry => entry.permission)).toEqual(['GRADE_MANAGE']);
	expect(catalogEntriesForStaffAssignmentTarget(catalog, 'activity_session')).toEqual([]);
	expect(permissionSelectionGrains(catalog[0]!)).toEqual([]);
	expect(permissionSelectionGrains(catalog[1]!)).toEqual(['grade_level', 'class_group', 'class_subject']);
});
