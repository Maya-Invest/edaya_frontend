import { entityVersions } from '$lib/entity-versions.svelte';
import { invalidatePageQueryCache } from '$lib/queries/page-query-cache';

/** Notify list routes that guardian roster data changed (create, import, link, etc.). */
export function notifyGuardiansListChanged(): void {
	invalidatePageQueryCache();
	try {
		entityVersions.bump('guardians');
	}
	catch {
		// Runes store may be unavailable outside the Svelte client runtime.
	}
}
