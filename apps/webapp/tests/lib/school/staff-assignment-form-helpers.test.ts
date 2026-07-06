import { describe, expect, test } from 'bun:test';
import {
	classGroupStaffAssignmentCanSubmit,
	pruneStaffAssignmentPermissions,
	staffAssignmentCanSubmit,
} from '$lib/school/staff-assignment-form-helpers';

describe('pruneStaffAssignmentPermissions', () => {
	test('returns pruned list when permissions are outside the allowed set', () => {
		const result = pruneStaffAssignmentPermissions(
			['A', 'B', 'C'],
			new Set(['A', 'C']),
		);
		expect(result).toEqual(['A', 'C']);
	});

	test('returns null when no pruning is needed', () => {
		const result = pruneStaffAssignmentPermissions(
			['A', 'B'],
			new Set(['A', 'B', 'C']),
		);
		expect(result).toBeNull();
	});
});

describe('staffAssignmentCanSubmit', () => {
	test('requires responsibility and class for class_group target', () => {
		expect(staffAssignmentCanSubmit({
			responsibility: '',
			classGroupId: 'class-1',
			targetKind: 'class_group',
			classSubjectId: '',
		})).toBe(false);
		expect(staffAssignmentCanSubmit({
			responsibility: 'Homeroom lead',
			classGroupId: 'class-1',
			targetKind: 'class_group',
			classSubjectId: '',
		})).toBe(true);
	});

	test('requires class subject when target is class_subject', () => {
		expect(staffAssignmentCanSubmit({
			responsibility: 'Math teacher',
			classGroupId: 'class-1',
			targetKind: 'class_subject',
			classSubjectId: '',
		})).toBe(false);
		expect(staffAssignmentCanSubmit({
			responsibility: 'Math teacher',
			classGroupId: 'class-1',
			targetKind: 'class_subject',
			classSubjectId: 'cs-math',
		})).toBe(true);
	});
});

describe('classGroupStaffAssignmentCanSubmit', () => {
	test('requires staff and responsibility', () => {
		expect(classGroupStaffAssignmentCanSubmit({
			responsibility: '',
			staffId: 'staff-1',
		})).toBe(false);
		expect(classGroupStaffAssignmentCanSubmit({
			responsibility: 'Coordinator',
			staffId: 'staff-1',
		})).toBe(true);
	});
});
