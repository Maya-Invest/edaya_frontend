import type { components } from '$lib/api/schema';
import type { getBrowserSchoolClient } from '$lib/api/school-client';

type SchoolClient = ReturnType<typeof getBrowserSchoolClient>;
type StaffPermissionAssignment = components['schemas']['StaffPermissionAssignment'];
type PermissionCatalogEntry = components['schemas']['PermissionCatalogEntry'];

export type { PermissionCatalogEntry, StaffPermissionAssignment };

export interface StaffPermissionAssignmentView extends StaffPermissionAssignment {
	scopeLabel: string;
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
): Promise<StaffPermissionAssignment[]> {
	return client.entities.staffPermissionAssignments.list({
		schoolId: scope.schoolId,
		academicYearId: scope.academicYearId,
		status: 'active',
	}) ?? [];
}

export async function buildStaffPermissionAssignmentViews(
	client: SchoolClient,
	assignments: readonly StaffPermissionAssignment[],
	academicYearId: string,
	translate?: (key: string) => string,
): Promise<StaffPermissionAssignmentView[]> {
	if (assignments.length === 0) {
		return [];
	}

	// The API accepts at most 100 rows per rendering request.
	const views: StaffPermissionAssignmentView[] = [];
	for (let offset = 0; offset < assignments.length; offset += 100) {
		const batch = assignments.slice(offset, offset + 100);
		const rendered = await client.authorization.scopeRender({
			academicYearId,
			items: batch.map(({ permission, scopes }) => ({ permission, scopes })),
		});
		views.push(...batch.map((assignment, index) => ({
			...assignment,
			scopeLabel: assignment.scopes.some(scope => scope.kind === 'school')
				? translate?.('roles.wholeSchool') ?? 'Whole school'
				: rendered.items[index]?.scopes.map(scope => scope.label).join('; ') ?? '—',
			tenantWide: assignment.scopes.some(scope => scope.kind === 'school'),
			hasMissingScope: false,
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
