import type { ActionGrantsSnapshot } from '$lib/auth/types';
import { checkPermission } from '$lib/permission-check';
import { describe, expect, it } from 'bun:test';

describe('action grant display', () => {
	it('keeps each action attached to its own scopes', () => {
		const grants: ActionGrantsSnapshot = [
			{ permission: 'GRADE_INPUT', scopes: [{ kind: 'class_subject', classGroupId: 'a', classSubjectId: 'math' }], source: 'manual' },
			{ permission: 'GRADE_READ', scopes: [{ kind: 'class_group', classGroupId: 'b' }], source: 'manual' },
		];
		expect(checkPermission(grants, 'GRADE_INPUT', { classId: 'a', subject: 'math' })).toBe(true);
		expect(checkPermission(grants, 'GRADE_INPUT', { classId: 'b', subject: 'math' })).toBe(false);
		expect(checkPermission(grants, 'GRADE_INPUT', { classId: 'a', subject: 'english' })).toBe(false);
		expect(checkPermission(grants, 'GRADE_READ', { classId: 'b' })).toBe(true);
		expect(checkPermission(grants, 'GRADE_READ', { classId: 'a' })).toBe(false);
	});

	it('requires the parent class for an all-subjects scope', () => {
		const grants: ActionGrantsSnapshot = [{ permission: 'GRADE_INPUT', scopes: [{ kind: 'class_subject', classGroupId: 'a' }], source: 'assignment' }];
		expect(checkPermission(grants, 'GRADE_INPUT', { classId: 'a', subject: 'math' })).toBe(true);
		expect(checkPermission(grants, 'GRADE_INPUT', { classId: 'b', subject: 'math' })).toBe(false);
		expect(checkPermission(grants, 'GRADE_INPUT', { subject: 'math' })).toBe(false);
	});

	it('does not turn owner provenance into a blanket permission', () => {
		const grants: ActionGrantsSnapshot = [{ permission: 'STUDENT_READ', scopes: [{ kind: 'school' }], source: 'owner' }];
		expect(checkPermission(grants, 'STUDENT_READ')).toBe(true);
		expect(checkPermission(grants, 'SERVICE_ACCOUNT_CREATE')).toBe(false);
	});

	it('checks validity and the selected academic year', () => {
		const grant: ActionGrantsSnapshot[number] = { permission: 'GRADE_READ', scopes: [{ kind: 'all', grain: 'class_group' }], academicYearId: 'year-a', source: 'manual' };
		expect(checkPermission([grant], 'GRADE_READ', { classId: 'a', academicYearId: 'year-a' })).toBe(true);
		expect(checkPermission([grant], 'GRADE_READ', { classId: 'a', academicYearId: 'year-b' })).toBe(false);
		expect(checkPermission([{ ...grant, endsAt: '2000-01-01T00:00:00Z' }], 'GRADE_READ')).toBe(false);
		expect(checkPermission([{ ...grant, startsAt: '2999-01-01T00:00:00Z' }], 'GRADE_READ')).toBe(false);
		expect(checkPermission(null, 'GRADE_READ')).toBe(false);
		expect(checkPermission([{ ...grant, scopes: [] }], 'GRADE_READ')).toBe(false);
	});
});
