import type { components } from '$lib/api/schema';
import type { getBrowserSchoolClient } from '$lib/api/school-client';
import type { PermissionCatalogEntry } from '$lib/api/staff-permission-assignments-data';
import { listAllEntityPages, schoolWideEntityList } from '$lib/api/entity-list-filters';
import { loadPermissionCatalog } from '$lib/api/staff-permission-assignments-data';

type SchoolClient = ReturnType<typeof getBrowserSchoolClient>;

export type StaffPermissionProfile = components['schemas']['StaffPermissionProfile'];
export type StaffPermissionProfileBinding = components['schemas']['StaffPermissionProfileBinding'];
export type StaffPermissionCode = StaffPermissionProfile['permissions'][number];

const PROFILE_CATALOG_SCOPE
	= 'Permission profile catalog loads school-wide templates and bindings.';

export function groupCatalogEntries(
	entries: readonly PermissionCatalogEntry[],
): { key: string; entries: PermissionCatalogEntry[] }[] {
	const groups = new Map<string, PermissionCatalogEntry[]>();
	for (const entry of entries) {
		const key = entry.permission.split('_')[0] ?? entry.permission;
		const list = groups.get(key) ?? [];
		list.push(entry);
		groups.set(key, list);
	}
	return [...groups.entries()].map(([key, groupEntries]) => ({ key, entries: groupEntries }));
}

export function boundStaffCount(
	bindings: readonly StaffPermissionProfileBinding[],
	profileId: string,
): number {
	return new Set(bindings.filter(binding => binding.profileId === profileId).map(binding => binding.staffId)).size;
}

export function bindingsForStaff(
	bindings: readonly StaffPermissionProfileBinding[],
	staffId: string,
	academicYearId?: string,
): StaffPermissionProfileBinding[] {
	return bindings
		.filter(binding => binding.staffId === staffId && (!academicYearId || binding.academicYearId === academicYearId))
		.slice()
		.sort((left, right) => left.sortOrder - right.sortOrder || left.id.localeCompare(right.id));
}

export interface SkippedPermission {
	permission: StaffPermissionCode;
	ownerProfileId: string;
}

export function skippedPermissionsByProfile(
	profiles: readonly StaffPermissionProfile[],
	orderedBindings: readonly StaffPermissionProfileBinding[],
): Map<string, SkippedPermission[]> {
	const byId = new Map(profiles.map(profile => [profile.id, profile]));
	const claimed = new Map<StaffPermissionCode, string>();
	const skipped = new Map<string, SkippedPermission[]>();

	for (const binding of orderedBindings) {
		const profile = byId.get(binding.profileId);
		if (!profile) {
			continue;
		}
		const skippedHere: SkippedPermission[] = [];
		for (const permission of profile.permissions) {
			const ownerProfileId = claimed.get(permission);
			if (ownerProfileId) {
				skippedHere.push({ permission, ownerProfileId });
				continue;
			}
			claimed.set(permission, profile.id);
		}
		skipped.set(profile.id, skippedHere);
	}

	return skipped;
}

export function isProfileBoundGrant(sourceProfileId: string | null | undefined): boolean {
	return Boolean(sourceProfileId);
}

export function customAssignmentsForStaff<T extends { sourceProfileId?: string | null }>(
	assignments: readonly T[],
): T[] {
	return assignments.filter(row => !isProfileBoundGrant(row.sourceProfileId));
}

export async function loadStaffPermissionProfiles(
	client: SchoolClient,
	schoolId: string,
): Promise<StaffPermissionProfile[]> {
	return listAllEntityPages(query => client.entities.staffPermissionProfiles.list(query), {
		baseQuery: {
			...schoolWideEntityList(PROFILE_CATALOG_SCOPE),
			schoolId,
		},
	});
}

export async function loadStaffPermissionProfileBindings(
	client: SchoolClient,
	schoolId: string,
): Promise<StaffPermissionProfileBinding[]> {
	return listAllEntityPages(query => client.entities.staffPermissionProfileBindings.list(query), {
		baseQuery: {
			...schoolWideEntityList(PROFILE_CATALOG_SCOPE),
			schoolId,
		},
	});
}

export async function loadPermissionProfileCatalogData(
	client: SchoolClient,
	schoolId: string,
): Promise<{
	profiles: StaffPermissionProfile[];
	bindings: StaffPermissionProfileBinding[];
}> {
	const [profiles, bindings] = await Promise.all([
		loadStaffPermissionProfiles(client, schoolId),
		loadStaffPermissionProfileBindings(client, schoolId),
	]);
	return { profiles, bindings };
}

export interface StaffPermissionFormData {
	profiles: StaffPermissionProfile[];
	catalog: PermissionCatalogEntry[];
}

export async function loadStaffPermissionFormData(client: SchoolClient, schoolId: string): Promise<StaffPermissionFormData> {
	const [profiles, catalog] = await Promise.all([loadStaffPermissionProfiles(client, schoolId), loadPermissionCatalog(client)]);
	return { profiles, catalog };
}
