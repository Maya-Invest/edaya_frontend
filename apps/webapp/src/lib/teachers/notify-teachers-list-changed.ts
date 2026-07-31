import { entityVersions } from '$lib/entity-versions.svelte';
import { invalidatePageQueryCache } from '$lib/queries/page-query-cache';

/** Notify list routes that teacher roster data changed (create, import, etc.). */
export function notifyTeachersListChanged(): void {
	invalidatePageQueryCache();
	try {
		entityVersions.bump('teachers');
	}
	catch {
		// Runes store may be unavailable outside the Svelte client runtime.
	}
}
