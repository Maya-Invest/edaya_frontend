import type { GuardiansPageState } from '../guardians-page.svelte';
import type { PageQueryRequest } from './guardian-page-status';
import { ApiError } from '@maya-invest/edaya-api-client';
import { listPageHasItems, resolveGuardianPageLoad } from './guardian-page-status';

export function querySchoolGuardiansPage(state: GuardiansPageState) {
	return (url: URL, request?: PageQueryRequest) => resolveGuardianPageLoad(url, {
		empty: () => ({ totalGuardians: 0 }),
		load: async (signal) => {
			signal.throwIfAborted();
			state.hydrateFiltersFromUrl();
			await state.loadFirstPage();
			signal.throwIfAborted();
			return { totalGuardians: state.totalGuardians };
		},
		hasItems: listPageHasItems,
	}, request);
}

export async function ensureGuardianDrawerSelection(
	state: GuardiansPageState,
	guardianId: string,
): Promise<boolean> {
	try {
		return await state.ensureSelectedGuardian(guardianId);
	}
	catch (error) {
		if (error instanceof ApiError && (error.status === 403 || error.status === 401)) {
			return true;
		}
		throw error;
	}
}
