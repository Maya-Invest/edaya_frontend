import type { GuardiansPageState } from '../guardians-page.svelte';
import { ApiError } from '@maya-invest/edaya-api-client';
import { listPageHasItems, resolveGuardianPageLoad } from './guardian-page-status';

export function querySchoolGuardiansPage(state: GuardiansPageState) {
	return (url: URL) => resolveGuardianPageLoad(url, {
		empty: () => ({ totalGuardians: 0 }),
		load: async () => {
			state.hydrateFiltersFromUrl();
			await state.loadFirstPage();
			return { totalGuardians: state.totalGuardians };
		},
		hasItems: listPageHasItems,
	});
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
