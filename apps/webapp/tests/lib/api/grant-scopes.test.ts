import { emptyGrantScope, grantScopesEquivalent, requiresSubjectClass, scopeSelectionsComplete, validGrantScopes } from '$lib/api/grant-scopes';
import { describe, expect, it } from 'bun:test';

describe('typed grant editor', () => {
	it('requires explicit complete targets and the action grain', () => {
		for (const grain of ['class_group', 'grade_level', 'subject', 'student', 'activity'] as const) {
			expect(validGrantScopes([emptyGrantScope(grain)], grain)).toBe(false);
			expect(validGrantScopes([{ kind: 'all', grain }], grain)).toBe(true);
			expect(validGrantScopes([{ kind: 'school' }], grain)).toBe(false);
		}
		expect(validGrantScopes([{ kind: 'school' }])).toBe(false);
		expect(validGrantScopes([])).toBe(false);
	});
	it('preserves independent parent and subject identifiers', () => {
		expect(validGrantScopes([{ kind: 'subject', gradeLevelId: 'level', subjectId: 'subject' }], 'subject')).toBe(true);
		expect(validGrantScopes([{ kind: 'subject', gradeLevelId: 'grade', classGroupId: 'a', subjectId: '' }], 'subject')).toBe(false);
		expect(validGrantScopes([{ kind: 'subject', gradeLevelId: 'grade', classGroupId: 'a' }], 'subject')).toBe(true);
		expect(validGrantScopes([{ kind: 'activity', classGroupId: 'a' }], 'activity')).toBe(true);
		expect(validGrantScopes([{ kind: 'class_group', classGroupId: 'a' }, { kind: 'class_group', classGroupId: 'a' }], 'class_group')).toBe(false);
	});

	it('treats equivalent grant scopes as the same regardless of order', () => {
		expect(grantScopesEquivalent(
			[{ kind: 'class_group', classGroupId: 'a' }, { kind: 'class_group', classGroupId: 'b' }],
			[{ kind: 'class_group', classGroupId: 'b' }, { kind: 'class_group', classGroupId: 'a' }],
		)).toBe(true);
		expect(grantScopesEquivalent(
			[{ kind: 'school' }],
			[{ kind: 'all', grain: 'class_group' }],
		)).toBe(false);
	});
});

it('uses catalog class requirements without broadening incomplete selections', () => {
 const required = { scopePolicy: { mode: 'resources' as const, allowedKinds: ['subject' as const], allowAll: true as const, subjectClassRequired: true } };
 const broad = { scopePolicy: { ...required.scopePolicy, subjectClassRequired: false } };
 expect(requiresSubjectClass([required])).toBe(true);
 expect(requiresSubjectClass([required, broad])).toBe(false);
 expect(scopeSelectionsComplete([{ kind: 'subject', gradeLevelId: 'grade', classGroupId: '' }])).toBe(false);
 expect(scopeSelectionsComplete([{ kind: 'subject', gradeLevelId: 'grade' }], true)).toBe(false);
 expect(scopeSelectionsComplete([{ kind: 'all', grain: 'subject' }], true)).toBe(false);
 expect(scopeSelectionsComplete([{ kind: 'subject', gradeLevelId: 'grade', classGroupId: 'a' }], true)).toBe(true);
});
