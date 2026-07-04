import { academicContext } from '$lib/academic/context.svelte';
import { staffAssignmentsForClassGroup } from '$lib/api/entity-list-filters';
import { fetchStaffMembers } from '$lib/api/staff-data';
import { loadPermissionCatalog } from '$lib/api/staff-permission-assignments-data';
import { detailDataContext } from '$lib/detail-data/context.svelte';
import { queryClient } from '$lib/queries/client';

export function classGroupDetailIdFromUrl(url: URL): string | null {
	const match = url.pathname.match(/^\/configuration\/classes\/([^/]+)$/);
	return match?.[1] ?? null;
}

export function gradeLevelDetailIdFromUrl(url: URL): string | null {
	const match = url.pathname.match(/^\/configuration\/grade-levels\/([^/]+)$/);
	return match?.[1] ?? null;
}

export async function hydrateClassGroupStaffDirectory(): Promise<void> {
	const client = queryClient();
	const schoolId = academicContext.schools[0]?.id ?? '';
	if (!schoolId) {
		return;
	}

	const staff = await fetchStaffMembers(client, {
		schoolId,
		academicYearId: academicContext.yearId,
	});
	detailDataContext.seedStaff(staff);
}

export async function hydrateClassGroupDrawer(classGroupId: string): Promise<void> {
	const client = queryClient();
	const schoolId = academicContext.schools[0]?.id ?? '';
	if (!schoolId) {
		return;
	}

	const [assignments, catalog] = await Promise.all([
		client.entities.staffAssignments.list(staffAssignmentsForClassGroup(classGroupId)),
		loadPermissionCatalog(client),
	]);

	await hydrateClassGroupStaffDirectory();
	detailDataContext.mergeStaffAssignments(assignments ?? []);
	detailDataContext.seedStaffPermissionData({
		assignments: detailDataContext.staffPermissionAssignments,
		catalog,
	});
}
