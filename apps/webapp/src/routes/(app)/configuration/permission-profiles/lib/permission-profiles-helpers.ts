import type { StaffPermissionProfile, StaffPermissionProfileBinding } from '$lib/api/staff-permission-profiles-data';
import type { PermissionCatalogEntry } from '$lib/api/staff-permission-assignments-data';

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
