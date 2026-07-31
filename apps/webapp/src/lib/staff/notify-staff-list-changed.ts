import { entityVersions } from '$lib/entity-versions.svelte';
import { invalidatePageQueryCache } from '$lib/queries/page-query-cache';

/** Notify list routes that staff roster data changed (create, import, etc.). */
export function notifyStaffListChanged(): void {
	invalidatePageQueryCache();
	try {
		entityVersions.bump('staff');
	}
	catch {
		// Runes store may be unavailable outside the Svelte client runtime.
	}
}
