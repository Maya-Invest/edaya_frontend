import type { PermissionProfilesPageState } from '../permission-profiles-page.svelte';
import { academicContext } from '$lib/academic/context.svelte';
import { getBrowserSchoolClient } from '$lib/api/school-client';
import { loadPermissionCatalog } from '$lib/api/staff-permission-assignments-data';
import { loadPermissionProfileCatalogData } from '$lib/api/staff-permission-profiles-data';
import { authSession } from '$lib/auth/session.svelte';
import { listPageHasItems, resolvePageLoad } from '$lib/queries/page-status';
import { emptyPermissionProfilesSlice } from './permission-profiles-helpers';

function resolveSchoolId(): string | null {
	return authSession.schoolId ?? academicContext.schools[0]?.id ?? null;
}

export async function loadPermissionProfilesSlice() {
	const schoolId = resolveSchoolId();
	if (!schoolId) {
		return emptyPermissionProfilesSlice();
	}
	const client = getBrowserSchoolClient();
	const [catalogData, catalog] = await Promise.all([
		loadPermissionProfileCatalogData(client, schoolId),
		loadPermissionCatalog(client),
	]);
	return {
		profiles: catalogData.profiles,
		bindings: catalogData.bindings,
		catalog,
	};
}

export function queryPermissionProfilesListPage(state: PermissionProfilesPageState) {
	return (url: URL) => resolvePageLoad(url, {
		empty: () => emptyPermissionProfilesSlice(),
		load: async () => {
			const data = await loadPermissionProfilesSlice();
			state.applySlice(data);
			return data;
		},
		hasItems: listPageHasItems,
		errorMessage: 'Unable to load permission profiles.',
	});
}
