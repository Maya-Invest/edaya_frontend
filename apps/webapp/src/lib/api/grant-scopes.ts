import type { components } from '$lib/api/schema';

export type GrantScope = components['schemas']['StaffPermissionAssignment']['scopes'][number];
export type UserScopeSelection = Exclude<GrantScope, { kind: 'school' }>;
export type ScopeGrain = Exclude<GrantScope['kind'], 'school' | 'all'>;
export type PermissionScopeGrain = ScopeGrain;

export const PERMISSION_SCOPE_GRAINS = [
	'class_group',
	'student',
	'grade_level',
	'subject',
	'activity',
] as const satisfies readonly PermissionScopeGrain[];

export function grantScopesEquivalent(left: readonly GrantScope[], right: readonly GrantScope[]): boolean {
	if (left.length !== right.length) {
		return false;
	}
	const keys = (scopes: readonly GrantScope[]) => [...scopes.map(scope => JSON.stringify(scope))].sort();
	const a = keys(left);
	const b = keys(right);
	return a.every((key, index) => key === b[index]);
}

export function emptyGrantScope(grain: ScopeGrain): GrantScope {
	switch (grain) {
		case 'class_group': return { kind: grain, classGroupId: '' };
		case 'grade_level': return { kind: grain, gradeLevelId: '' };
		case 'subject': return { kind: grain, gradeLevelId: '' };
		case 'activity': return { kind: grain };
		case 'student': return { kind: grain, studentId: '' };
	}
}

/** Validate editor completeness without converting to a second scope representation. */
export function validGrantScopes(scopes: readonly GrantScope[], grain?: ScopeGrain): boolean {
	if (!scopes.length || new Set(scopes.map(scope => JSON.stringify(scope))).size !== scopes.length)
		return false;
	return scopes.every((scope) => {
		if (!grain)
			return false;
		if (scope.kind === 'all')
			return scope.grain === grain && scopes.length === 1;
		if (scope.kind !== grain)
			return false;
		switch (scope.kind) {
			case 'class_group': return Boolean(scope.classGroupId);
			case 'grade_level': return Boolean(scope.gradeLevelId);
			case 'subject': return Boolean(scope.gradeLevelId) && scope.subjectId !== '' && scope.classGroupId !== '';
			case 'activity': return Boolean(scope.activityId || scope.classGroupId);
			case 'student': return Boolean(scope.studentId);
		}
		return false;
	});
}

export function scopeSelectionsComplete(scopes: readonly GrantScope[], subjectClassRequired = false): boolean {
	return scopes.every(scope => scope.kind !== 'school' && (!subjectClassRequired || ((scope.kind !== 'subject' || Boolean(scope.classGroupId)) && !(scope.kind === 'all' && scope.grain === 'subject')))) && PERMISSION_SCOPE_GRAINS.every((grain) => {
		const selected = scopes.filter(scope => (scope.kind === 'all' ? scope.grain : scope.kind) === grain);
		return !selected.length || validGrantScopes(selected, grain);
	});
}

export function permissionSelectionGrains(entry: Pick<components['schemas']['PermissionCatalogEntry'], 'scopePolicy'>): PermissionScopeGrain[] {
	return entry.scopePolicy.mode === 'resources' ? [...entry.scopePolicy.allowedKinds] : [];
}

export function requiresSubjectClass(entries: readonly Pick<components['schemas']['PermissionCatalogEntry'], 'scopePolicy'>[]): boolean {
	const subjectPolicies = entries.map(entry => entry.scopePolicy).filter(policy => policy.mode === 'resources' && policy.allowedKinds.includes('subject'));
	return subjectPolicies.length > 0 && subjectPolicies.every(policy => policy.mode === 'resources' && policy.subjectClassRequired === true);
}
