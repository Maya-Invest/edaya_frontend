import { academicContext } from '$lib/academic/context.svelte';
import { fetchStaffMembers } from '$lib/api/staff-data';
import { loadStaffPermissionPageData } from '$lib/api/staff-permission-assignments-data';
import { detailDataContext } from '$lib/detail-data/context.svelte';
import { t } from '$lib/i18n';
import { queryClient } from '$lib/queries/client';
import { listPageHasItems, resolvePageLoad } from '$lib/queries/page-status';
import { get } from 'svelte/store';

export function queryRolesPage() {
	return (url: URL) => resolvePageLoad(url, {
		empty: () => ({}),
		load: async () => {
			const schoolId = academicContext.schools[0]?.id ?? '';
			const academicYearId = academicContext.yearId;
			const client = queryClient();
			const [staff, permissionData] = await Promise.all([
				fetchStaffMembers(client, { schoolId, academicYearId }),
				loadStaffPermissionPageData(client, { schoolId, academicYearId }, get(t)),
			]);
			detailDataContext.seedStaff(staff);
			detailDataContext.seedStaffPermissionData(permissionData);
			return {};
		},
		hasItems: listPageHasItems,
	});
}
