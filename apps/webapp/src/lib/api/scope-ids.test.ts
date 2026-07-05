import { describe, expect, test } from 'bun:test';
import {
	catalogScopeIncludesClassGroupInPath,
	classSubjectScopePathKey,
	composeClassGroupScopeIds,
	composeClassSubjectScopeIds,
	composeStudentScopeIds,
	findConflictingClassSubjectScopePathIndex,
	parseClassGroupScopeIds,
	parseClassSubjectScopeIds,
	parseStudentScopeIds,
} from './scope-ids';

describe('scope-ids', () => {
	test('composes and parses class group scope ids', () => {
		const scopeIds = composeClassGroupScopeIds(['class-1', 'class-2']);
		expect(scopeIds).toBe('class-1,class-2');
		expect(parseClassGroupScopeIds(scopeIds)).toEqual(['class-1', 'class-2']);
	});

	test('resolves class subject scope path keys and detects duplicates', () => {
		const rows = [
			{ classGroupId: 'class-1', classSubjectId: 'cs-math' },
			{ classGroupId: 'class-2', wildcard: true },
			{ classGroupId: 'class-1', classSubjectId: '' },
		];

		expect(classSubjectScopePathKey(rows[0]!)).toBe('class-1:cs-math');
		expect(classSubjectScopePathKey(rows[1]!)).toBe('class-2:*');
		expect(classSubjectScopePathKey(rows[2]!)).toBeNull();
		expect(findConflictingClassSubjectScopePathIndex(rows, 2, {
			classGroupId: 'class-1',
			classSubjectId: 'cs-math',
		})).toBe(0);
		expect(findConflictingClassSubjectScopePathIndex(rows, 0, {
			classGroupId: 'class-2',
			wildcard: true,
		})).toBe(1);
	});

	test('detects wildcard coverage conflicts for class subject scopes', () => {
		const rows = [
			{ classGroupId: 'class-1', wildcard: true },
			{ classGroupId: 'class-2', classSubjectId: 'cs-math' },
		];

		expect(findConflictingClassSubjectScopePathIndex(rows, 1, {
			classGroupId: 'class-1',
			classSubjectId: 'cs-english',
		})).toBe(0);
		expect(findConflictingClassSubjectScopePathIndex(rows, 0, {
			classGroupId: 'class-2',
			wildcard: true,
		})).toBe(1);
	});

	test('composes and parses class subject scope ids', () => {
		const scopeIds = composeClassSubjectScopeIds([
			{ classGroupId: 'class-1', classSubjectId: 'cs-math' },
			{ classGroupId: 'class-2', wildcard: true },
		]);
		expect(scopeIds).toBe('class-1:cs-math,class-2:*');
		expect(parseClassSubjectScopeIds(scopeIds)).toEqual([
			{ classGroupId: 'class-1', classSubjectId: 'cs-math' },
			{ classGroupId: 'class-2', wildcard: true },
		]);
	});

	test('composes and parses student scope ids', () => {
		const scopeIds = composeStudentScopeIds(['student-1', 'student-2']);
		expect(scopeIds).toBe('student-1,student-2');
		expect(parseStudentScopeIds(scopeIds)).toEqual(['student-1', 'student-2']);
	});

	test('detects class group segments in catalog scope paths', () => {
		expect(catalogScopeIncludesClassGroupInPath('class_group')).toBe(true);
		expect(catalogScopeIncludesClassGroupInPath('class_subject')).toBe(true);
		expect(catalogScopeIncludesClassGroupInPath('grade_level')).toBe(false);
		expect(catalogScopeIncludesClassGroupInPath('student')).toBe(false);
	});
});
