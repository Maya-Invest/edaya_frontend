import type { components } from '$lib/api/schema';

export type GrantScope = components['schemas']['StaffPermissionAssignment']['scopes'][number];
export type ScopeGrain = Exclude<GrantScope['kind'], 'school' | 'all'>;
export type PermissionScopeGrain = 'school' | ScopeGrain;

export const PERMISSION_SCOPE_GRAINS = [
	'school',
	'class_group',
	'class_subject',
	'student',
	'grade_level',
	'grade_level_subject',
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
		case 'class_subject': return { kind: grain, classGroupId: '' };
		case 'grade_level': return { kind: grain, gradeLevelId: '' };
		case 'grade_level_subject': return { kind: grain, gradeLevelId: '' };
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
			return scope.kind === 'school' && scopes.length === 1;
		if (scope.kind === 'all')
			return scope.grain === grain && scopes.length === 1;
		if (scope.kind !== grain)
			return false;
		switch (scope.kind) {
			case 'class_group': return Boolean(scope.classGroupId);
			case 'class_subject': return Boolean(scope.classGroupId) && scope.classSubjectId !== '';
			case 'grade_level': return Boolean(scope.gradeLevelId);
			case 'grade_level_subject': return Boolean(scope.gradeLevelId) && scope.gradeLevelSubjectId !== '';
			case 'activity': return Boolean(scope.activityId || scope.classGroupId);
			case 'student': return Boolean(scope.studentId);
		}
		return false;
	});
}

export function scopeSelectionsComplete(scopes: readonly GrantScope[]): boolean {
	return PERMISSION_SCOPE_GRAINS.every((grain) => {
		const selected = scopes.filter(scope => (scope.kind === 'all' ? scope.grain : scope.kind) === grain);
		return !selected.length || validGrantScopes(selected, grain === 'school' ? undefined : grain);
	});
}

export function permissionSelectionGrains(entry: { permission: string; scope?: PermissionScopeGrain | 'platform' }): PermissionScopeGrain[] {
	if (entry.scope === 'platform')
		return [];
	if (['ATTENDANCE_VALIDATE', 'CLASS_LOGBOOK_VALIDATE', 'DISCIPLINE_VALIDATE', 'REPORT_CARD_PUBLISH'].includes(entry.permission))
		return ['school', 'class_group'];
	return [entry.scope ?? 'school'];
}
