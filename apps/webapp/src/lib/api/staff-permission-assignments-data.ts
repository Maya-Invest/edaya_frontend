import type { UserScopeSelection } from '$lib/api/grant-scopes';
import type { RenderedPermissionScope } from '$lib/api/permission-scope-labels';
import type { components } from '$lib/api/schema';
import type { getBrowserSchoolClient } from '$lib/api/school-client';
import { listAllEntityPages } from '$lib/api/entity-list-filters';

type SchoolClient = ReturnType<typeof getBrowserSchoolClient>;
type StaffPermissionAssignment = components['schemas']['StaffPermissionAssignment'];
type PermissionCatalogEntry = components['schemas']['PermissionCatalogEntry'];

export type { PermissionCatalogEntry, StaffPermissionAssignment };

export interface StaffPermissionAssignmentView extends StaffPermissionAssignment {
	customScopes?: UserScopeSelection[];
	useDefaultScopes?: boolean;
	warnings?: components['schemas']['StaffManualPermissionAssignment']['warnings'];
	scopeLabel: string;
	renderedScopes: RenderedPermissionScope[];
	tenantWide: boolean;
	hasMissingScope: boolean;
}

export function permissionLabelKey(permission: string): string {
	return `permission.${permission}`;
}

export function formatPermissionLabel(
	permission: string,
	translate?: (key: string) => string,
): string {
	if (translate) {
		const label = translate(permissionLabelKey(permission));
		if (label !== permissionLabelKey(permission)) {
			return label;
		}
	}
	return permission
		.split('_')
		.map(word => word.charAt(0) + word.slice(1).toLowerCase())
		.join(' ');
}

export async function loadPermissionCatalog(client: SchoolClient): Promise<PermissionCatalogEntry[]> {
	const response = await client.authorization.permissionCatalog();
	return response.items ?? [];
}

export async function loadStaffPermissionAssignments(
	client: SchoolClient,
	scope: { schoolId: string; academicYearId: string },
): Promise<(StaffPermissionAssignment & { customScopes?: UserScopeSelection[]; useDefaultScopes?: boolean; warnings?: components['schemas']['StaffManualPermissionAssignment']['warnings'] })[]> {
	const [grants, manuals] = await Promise.all([
		listAllEntityPages(query => client.entities.staffPermissionAssignments.list(query), { baseQuery: { ...scope, status: 'active' } }),
		listAllEntityPages(query => client.entities.staffManualPermissionAssignments.list(query), { baseQuery: scope }),
	]);
	return [
		...grants.filter(row => !row.sourceManualAssignmentId),
		...manuals.map(source => ({ ...source, scopes: grants.find(row => row.sourceManualAssignmentId === source.id)?.scopes ?? [] })),
	];
}

export async function buildStaffPermissionAssignmentViews(
	client: SchoolClient,
	assignments: readonly (StaffPermissionAssignment & { customScopes?: UserScopeSelection[]; useDefaultScopes?: boolean; warnings?: components['schemas']['StaffManualPermissionAssignment']['warnings'] })[],
	academicYearId: string,
	_translate?: (key: string) => string,
): Promise<StaffPermissionAssignmentView[]> {
	if (assignments.length === 0) {
		return [];
	}

	// The API accepts at most 100 rows per rendering request.
	const views: StaffPermissionAssignmentView[] = [];
	for (let offset = 0; offset < assignments.length; offset += 100) {
		const batch = assignments.slice(offset, offset + 100);
		const scopedAssignments = batch.filter(row => row.scopes.length);
		const rendered = scopedAssignments.length
			? await client.authorization.scopeRender({
					academicYearId,
					items: scopedAssignments.map(({ permission, scopes }) => ({ permission, scopes })),
				})
			: { items: [] };
		const scopesById = new Map(scopedAssignments.map((row, index) => [row.id, rendered.items[index]?.scopes ?? []]));
		views.push(...batch.map(assignment => ({
			...assignment,
			renderedScopes: (scopesById.get(assignment.id) ?? []).filter(scope => scope.scope.kind !== 'school'),
			scopeLabel: assignment.scopes.some(scope => scope.kind === 'school')
				? ''
				: scopesById.get(assignment.id)?.map(scope => scope.label).join('; ') || '—',
			tenantWide: assignment.scopes.some(scope => scope.kind === 'school'),
			hasMissingScope: scopesById.get(assignment.id)?.some(scope => scope.missing) ?? false,
		})));
	}
	return views;
}

export async function loadStaffPermissionPageData(
	client: SchoolClient,
	scope: { schoolId: string; academicYearId: string },
	translate?: (key: string) => string,
): Promise<{
	catalog: PermissionCatalogEntry[];
	assignments: StaffPermissionAssignmentView[];
}> {
	const [catalog, assignments] = await Promise.all([
		loadPermissionCatalog(client),
		loadStaffPermissionAssignments(client, scope),
	]);
	const views = await buildStaffPermissionAssignmentViews(
		client,
		assignments,
		scope.academicYearId,
		translate,
	);
	return { catalog, assignments: views };
}
