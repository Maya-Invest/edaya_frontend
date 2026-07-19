import { page } from '$app/stores';
import { appGoto } from '$lib/navigation/app-navigation';
import { refreshAppShellData } from '$lib/api/mutations/run-mutation';
import { get } from 'svelte/store';

/** Close URL-backed detail drawer after deleting the open entity. */
export async function navigateToListAfterEntityDelete(): Promise<void> {
	const { getListPathForDetail } = await import('$lib/detail-routes');
	const listPath = getListPathForDetail(get(page).url.pathname);
	if (listPath) {
		await appGoto(listPath, { replaceState: true, invalidateAll: true });
		await refreshAppShellData();
	}
}
