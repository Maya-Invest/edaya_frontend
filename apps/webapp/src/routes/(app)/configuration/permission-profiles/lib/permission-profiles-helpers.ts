import type { PermissionCatalogEntry } from '$lib/api/staff-permission-assignments-data';
import type { StaffPermissionProfile, StaffPermissionProfileBinding } from '$lib/api/staff-permission-profiles-data';

export interface PermissionProfilesPageSlice {
	profiles: StaffPermissionProfile[];
	bindings: StaffPermissionProfileBinding[];
	catalog: PermissionCatalogEntry[];
}

export function emptyPermissionProfilesSlice(): PermissionProfilesPageSlice {
	return {
		profiles: [],
		bindings: [],
		catalog: [],
	};
}

/** Group saved codes, not catalog entries, so retired permissions remain inspectable. */
export function profilePermissionGroups(permissions: readonly string[], catalog: readonly PermissionCatalogEntry[]) {
	const byCode = new Map(catalog.map(entry => [entry.permission as string, entry]));
	const groups = new Map<string, { permission: string; entry?: PermissionCatalogEntry }[]>();
	for (const permission of permissions) {
		const key = permission.split('_')[0];
		const entries = groups.get(key) ?? [];
		entries.push({ permission, entry: byCode.get(permission) });
		groups.set(key, entries);
	}
	return [...groups].map(([key, entries]) => ({ key, entries }));
}
