import type { StaffPageState } from '../staff-page.svelte';
import { ApiError } from '@edaya/api-client';
import { listPageHasItems, resolveStaffPageLoad } from './staff-page-status';

export function querySchoolStaffPage(state: StaffPageState) {
	return (url: URL) => resolveStaffPageLoad(url, {
		empty: () => ({ totalStaff: 0 }),
		load: async () => {
			state.hydrateFiltersFromUrl();
			await state.loadFirstPage();
			return { totalStaff: state.totalStaff };
		},
		hasItems: listPageHasItems,
	});
}

export async function ensureStaffDrawerSelection(
	state: StaffPageState,
	staffId: string,
): Promise<boolean> {
	try {
		return await state.ensureSelectedStaff(staffId);
	}
	catch (error) {
		if (error instanceof ApiError && (error.status === 403 || error.status === 401)) {
			return true;
		}
		throw error;
	}
}
