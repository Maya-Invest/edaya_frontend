import { describe, expect, test } from 'bun:test';
import {
	composeClassGroupScopeIds,
	composeClassSubjectScopeIds,
	composeStudentScopeIds,
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
});
