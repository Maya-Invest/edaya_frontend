import type { GrantScope } from '$lib/api/grant-scopes';
import type { StaffPermissionAssignmentView } from '$lib/api/staff-permission-assignments-data';
import { loadDefaultScopeLabels, permissionScopeKey, permissionScopeLabel, uniqueRenderedScopes } from '$lib/api/permission-scope-labels';
import { buildStaffPermissionAssignmentViews } from '$lib/api/staff-permission-assignments-data';
import { expect, test } from 'bun:test';
import { effectiveProfileScopes } from '../../../src/routes/(app)/school/staff/lib/staff-permission-scopes';

const rendered = (scope: GrantScope, label = 'Class A', missing = false) => ({ scope, label, missing });
const classScope = rendered({ kind: 'class_group', classGroupId: 'class-a' });
function assignment(overrides: Partial<StaffPermissionAssignmentView> = {}): StaffPermissionAssignmentView {
	return {
		id: 'grant-a',
		schoolId: 'school',
		staffId: 'staff',
		academicYearId: 'year',
		permission: 'GRADE_READ',
		status: 'active',
		createdAt: '2026-01-01T00:00:00Z',
		scopes: [classScope.scope],
		sourceProfileId: 'profile',
		sourceProfileBindingId: 'binding',
		scopeLabel: 'Class A',
		renderedScopes: [classScope],
		tenantWide: false,
		hasMissingScope: false,
		...overrides,
	};
}

test('scope identity deduplicates identical scopes, not identical resource labels', () => {
	const reordered: GrantScope = { classGroupId: 'class-a', kind: 'class_group' };
	expect(permissionScopeKey(classScope.scope)).toBe(permissionScopeKey(reordered));
	expect(uniqueRenderedScopes([classScope, rendered(reordered), rendered({ kind: 'class_group', classGroupId: 'class-b' })])).toHaveLength(2);
});

test('profile tags use only current generated grants, including defaults, and exclude missing targets', () => {
	const rows = [assignment(), assignment({ id: 'duplicate', permission: 'GRADE_MANAGE', useDefaultScopes: true }), assignment({ id: 'foreign-binding', sourceProfileBindingId: 'another' }), assignment({ id: 'future', startsAt: '2030-01-01', renderedScopes: [rendered({ kind: 'school' })] }), assignment({ id: 'expired', endsAt: '2020-01-01', renderedScopes: [rendered({ kind: 'school' })] }), assignment({ id: 'missing', renderedScopes: [rendered({ kind: 'class_group', classGroupId: 'deleted' }, 'Unavailable', true)] })];
	expect(effectiveProfileScopes(rows, 'binding', Date.parse('2026-10-15'))).toEqual([classScope]);
	expect(effectiveProfileScopes(rows, 'shadowed')).toEqual([]);
});

test('view builder retains structured scopes and maps unresolved rows without shifting labels', async () => {
	const client = { authorization: { scopeRender: async () => ({ items: [{ scopes: [classScope] }] }) } } as unknown as Parameters<typeof buildStaffPermissionAssignmentViews>[0];
	const rows = await buildStaffPermissionAssignmentViews(client, [assignment({ id: 'unresolved', scopes: [] }), assignment()], 'year');
	expect(rows[0]?.renderedScopes).toEqual([]);
	expect(rows[0]?.scopeLabel).toBe('—');
	expect(rows[1]?.renderedScopes).toEqual([classScope]);
	expect(rows[1]?.scopeLabel).toBe('Class A');
});

test('default labels include saved selections without grants and batch unique requests', async () => {
	const calls: GrantScope[][] = [];
	const client = { authorization: { scopeSelectionsRender: async ({ scopes }: { scopes: GrantScope[] }) => {
		calls.push(scopes);
		return { scopes: scopes.map(scope => rendered(scope)) };
	} } } as unknown as Parameters<typeof loadDefaultScopeLabels>[0];
	const scopes: GrantScope[] = Array.from({ length: 101 }, (_, index) => ({ kind: 'grade_level', gradeLevelId: `level-${index}` }));
	const labels = await loadDefaultScopeLabels(client, 'year', [...scopes, scopes[0]!]);
	expect(calls.map(call => call.length)).toEqual([100, 1]);
	expect(Object.keys(labels)).toHaveLength(101);
	expect(await loadDefaultScopeLabels(client, 'year', [])).toEqual({});
	expect(calls).toHaveLength(2);
});

test('generic labels localize from scope structure and preserve names with punctuation', () => {
	const translate = (key: string) => `translated:${key}`;
	expect(permissionScopeLabel(rendered({ kind: 'school' }), translate)).toBe('');
	expect(permissionScopeLabel(rendered({ kind: 'all', grain: 'student' }), translate)).toBe('translated:staff.scopeAll.student');
	expect(permissionScopeLabel(rendered(classScope.scope, 'Class; A / B'), translate)).toBe('Class; A / B');
	expect(permissionScopeLabel(rendered(classScope.scope, 'Hidden name', true), translate)).toBe('translated:staff.scopeUnavailable');
});
