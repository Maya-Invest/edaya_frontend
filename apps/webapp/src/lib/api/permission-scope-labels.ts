import type { GrantScope } from '$lib/api/grant-scopes';
import type { components } from '$lib/api/schema';
import type { getBrowserSchoolClient } from '$lib/api/school-client';

export type RenderedPermissionScope = components['schemas']['ScopeRenderResponse']['items'][number]['scopes'][number];

/** Identity is independent of labels and object property insertion order. */
export function permissionScopeKey(scope: GrantScope): string {
	return JSON.stringify(Object.entries(scope).sort(([left], [right]) => left.localeCompare(right)));
}

export function uniqueRenderedScopes(scopes: readonly RenderedPermissionScope[]): RenderedPermissionScope[] {
	return [...new Map(scopes.filter(scope => scope.scope.kind !== 'school').map(scope => [permissionScopeKey(scope.scope), scope])).values()];
}

export function permissionScopeLabel(scope: RenderedPermissionScope, translate: (key: string, vars?: Record<string, string | number>) => string): string {
	if (scope.missing)
		return translate('staff.scopeUnavailable');
	if (scope.scope.kind === 'school')
		return '';
	if (scope.scope.kind === 'all')
		return translate(`staff.scopeAll.${scope.scope.grain}`);
	return scope.label;
}

/** Defaults remain visible even when no permission produces a grant for them. */
export async function loadDefaultScopeLabels(
	client: ReturnType<typeof getBrowserSchoolClient>,
	academicYearId: string,
	selections: readonly GrantScope[],
): Promise<Record<string, RenderedPermissionScope>> {
	const scopes = [...new Map(selections.map(scope => [permissionScopeKey(scope), scope])).values()];
	const labels: Record<string, RenderedPermissionScope> = {};
	for (let offset = 0; offset < scopes.length; offset += 100) {
		const response = await client.authorization.scopeSelectionsRender({ academicYearId, scopes: scopes.slice(offset, offset + 100).filter(scope => scope.kind !== 'school') });
		for (const scope of response.scopes)
			labels[permissionScopeKey(scope.scope)] = scope;
	}
	return labels;
}
