import { page } from '$app/stores';
import { refreshAppShellData } from '$lib/api/mutations/run-mutation';
import { listPathForDetailNavigation } from '$lib/detail-route-patterns';
import { appGoto } from '$lib/navigation/app-navigation';
import { get } from 'svelte/store';

/** Close URL-backed detail drawer after deleting the open entity. */
export async function navigateToListAfterEntityDelete(): Promise<void> {
	const pathname = get(page).url.pathname;
	const listPath = listPathForDetailNavigation(pathname);
	if (listPath !== pathname) {
		await appGoto(listPath, { replaceState: true, invalidateAll: true });
		await refreshAppShellData();
	}
}
