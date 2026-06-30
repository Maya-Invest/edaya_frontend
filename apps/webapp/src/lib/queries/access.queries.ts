import { academicContext } from '$lib/academic/context.svelte';
import { loadAccessRolesData } from '$lib/api/access-roles-data';
import { fetchStaffMembers } from '$lib/api/staff-data';
import { detailDataContext } from '$lib/detail-data/context.svelte';
import { queryClient } from '$lib/queries/client';
import { listPageHasItems, resolvePageLoad } from '$lib/queries/page-status';

export function queryRolesPage() {
	return (url: URL) => resolvePageLoad(url, {
		empty: () => ({}),
		load: async () => {
			const [staff, accessRolesData] = await Promise.all([
				fetchStaffMembers(queryClient(), {
					schoolId: academicContext.schools[0]?.id ?? '',
					academicYearId: academicContext.yearId,
				}),
				loadAccessRolesData(queryClient(), academicContext.schools[0]?.id ?? ''),
			]);
			detailDataContext.seedStaff(staff);
			detailDataContext.seedRolePermissions({
				roleCrudMatrix: accessRolesData.roleCrudMatrix,
				roleEnabledPermissions: accessRolesData.roleEnabledPermissions,
			});
			return {};
		},
		hasItems: listPageHasItems,
	});
}
