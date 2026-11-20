import type { StaffPageState } from '../staff-page.svelte';
import type { PageQueryRequest } from './staff-page-status';
import { ApiError } from '@maya-invest/edaya-api-client';
import { listPageHasItems, resolveStaffPageLoad } from './staff-page-status';

export function querySchoolStaffPage(state: StaffPageState) {
	return (url: URL, request?: PageQueryRequest) => resolveStaffPageLoad(url, {
		empty: () => ({ totalStaff: 0 }),
		load: async (signal) => {
			signal.throwIfAborted();
			state.hydrateFiltersFromUrl();
			await state.loadFirstPage();
			signal.throwIfAborted();
			return { totalStaff: state.totalStaff };
		},
		hasItems: listPageHasItems,
	}, request);
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
