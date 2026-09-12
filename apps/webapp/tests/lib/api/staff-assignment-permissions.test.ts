import { catalogEntriesForStaffAssignmentTarget } from '$lib/api/staff-assignment-permissions';
import { expect, test } from 'bun:test';

test('assignments offer the canonical catalog actions that match their placement grain', () => {
	const catalog = [
		{ permission: 'STAFF_READ' as const },
		{ permission: 'GRADE_INPUT' as const, scope: 'class_subject' as const },
		{ permission: 'GRADE_READ' as const, scope: 'class_group' as const },
		{ permission: 'QUERY_STUDENT_DETAIL_READ' as const, scope: 'student' as const },
	];
	for (const target of ['class_group', 'class_subject'] as const) {
		expect(catalogEntriesForStaffAssignmentTarget(catalog, target).map(entry => entry.permission)).toEqual(['GRADE_INPUT', 'GRADE_READ']);
	}
});
