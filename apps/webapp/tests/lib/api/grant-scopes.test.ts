import { emptyGrantScope, validGrantScopes } from '$lib/api/grant-scopes';
import { describe, expect, it } from 'bun:test';

describe('typed grant editor', () => {
	it('requires explicit complete targets and the action grain', () => {
		for (const grain of ['class_group', 'class_subject', 'grade_level', 'grade_level_subject', 'student', 'activity'] as const) {
			expect(validGrantScopes([emptyGrantScope(grain)], grain)).toBe(false);
			expect(validGrantScopes([{ kind: 'all', grain }], grain)).toBe(true);
			expect(validGrantScopes([{ kind: 'school' }], grain)).toBe(false);
		}
		expect(validGrantScopes([{ kind: 'school' }])).toBe(true);
		expect(validGrantScopes([])).toBe(false);
	});
	it('preserves independent parent and subject identifiers', () => {
		expect(validGrantScopes([{ kind: 'grade_level_subject', gradeLevelId: 'level', gradeLevelSubjectId: 'subject' }], 'grade_level_subject')).toBe(true);
		expect(validGrantScopes([{ kind: 'class_subject', classGroupId: 'a', classSubjectId: '' }], 'class_subject')).toBe(false);
		expect(validGrantScopes([{ kind: 'class_subject', classGroupId: 'a' }], 'class_subject')).toBe(true);
		expect(validGrantScopes([{ kind: 'activity', classGroupId: 'a' }], 'activity')).toBe(true);
		expect(validGrantScopes([{ kind: 'class_group', classGroupId: 'a' }, { kind: 'class_group', classGroupId: 'a' }], 'class_group')).toBe(false);
	});
});
