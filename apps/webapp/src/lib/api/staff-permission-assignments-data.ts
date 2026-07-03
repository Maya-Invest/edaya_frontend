import type { components } from '$lib/api/schema';
import type { getBrowserSchoolClient } from '$lib/api/school-client';

type SchoolClient = ReturnType<typeof getBrowserSchoolClient>;
type StaffPermissionAssignment = components['schemas']['StaffPermissionAssignment'];
type PermissionCatalogEntry = components['schemas']['PermissionCatalogEntry'];
type ScopeRenderItem = components['schemas']['ScopeRenderResponse']['items'][number];

export type { PermissionCatalogEntry, StaffPermissionAssignment };

export interface StaffPermissionAssignmentView extends StaffPermissionAssignment {
	scopeLabel: string;
	tenantWide: boolean;
	isSynced: boolean;
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

function scopeLabelFromRender(
	item: ScopeRenderItem | undefined,
	scopeIds: string,
	translate?: (key: string) => string,
): string {
	if (!item) {
		return scopeIds || '—';
	}
	if (item.tenantWide) {
		return translate?.('roles.wholeSchool') ?? 'Whole school';
	}
	if (item.clauses.length === 0) {
		return scopeIds || '—';
	}
	return item.clauses.map(clause => clause.label).join('; ');
}

function hasMissingScope(item: ScopeRenderItem | undefined): boolean {
	if (!item) {
		return false;
	}
	return item.clauses.some(clause => clause.segments.some(segment => Boolean(segment.missing)));
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

	const rendered = await client.authorization.scopeRender({
		academicYearId,
		items: assignments.map(assignment => ({
			permission: assignment.permission,
			scopeIds: assignment.scopeIds ?? '',
		})),
	});

	const renderedByScopeIds = new Map(
		(rendered.items ?? []).map(item => [`${item.permission ?? ''}:${item.scopeIds}`, item]),
	);

	return assignments.map((assignment) => {
		const renderKey = `${assignment.permission}:${assignment.scopeIds ?? ''}`;
		const renderedItem = renderedByScopeIds.get(renderKey);
		return {
			...assignment,
			scopeLabel: scopeLabelFromRender(renderedItem, assignment.scopeIds ?? '', translate),
			tenantWide: renderedItem?.tenantWide ?? (assignment.scopeIds ?? '') === '',
			isSynced: Boolean(assignment.sourceStaffAssignmentId),
			hasMissingScope: hasMissingScope(renderedItem),
		};
	});
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
