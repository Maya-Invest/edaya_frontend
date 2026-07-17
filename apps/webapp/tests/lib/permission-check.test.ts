import { describe, expect, it } from 'bun:test';
import type { EffectiveGrantsSnapshot } from '$lib/auth/types';
import { checkPermission } from '$lib/permission-check';

function mockGrants(
	permissions: readonly string[],
	scopeIdsByPermission: Record<string, string> = {},
): EffectiveGrantsSnapshot {
	return {
		isElevated: false,
		permissions: [...permissions],
		scopeGrants: [],
		scopeIdsByPermission,
	};
}

describe('permission-check — scopeIdsByPermission', () => {
	it('allows tenant-wide permission without scoped context', () => {
		const grants = mockGrants(['STUDENT_READ'], { STUDENT_READ: '' });
		expect(checkPermission(grants, 'STUDENT_READ')).toBe(true);
	});

	it('allows class-scoped permission when scope ids cover the class', () => {
		const grants = mockGrants(['GRADE_INPUT'], { GRADE_INPUT: '6a,6b' });
		expect(checkPermission(grants, 'GRADE_INPUT', { classId: '6a' })).toBe(true);
		expect(checkPermission(grants, 'GRADE_INPUT', { classId: '7a' })).toBe(false);
	});

	it('allows class-subject scope via wildcard path', () => {
		const grants = mockGrants(['GRADE_INPUT'], { GRADE_INPUT: '6a:*' });
		expect(checkPermission(grants, 'GRADE_INPUT', { subject: 'math-1' })).toBe(true);
	});

	it('denies scoped permission when scope ids are missing', () => {
		const grants = mockGrants(['GRADE_INPUT']);
		expect(checkPermission(grants, 'GRADE_INPUT', { classId: '6a' })).toBe(false);
	});
});
