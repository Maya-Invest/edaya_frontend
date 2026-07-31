import { entityVersions } from '$lib/entity-versions.svelte';
import { invalidatePageQueryCache } from '$lib/queries/page-query-cache';

/** Notify list routes that subject catalog data changed (create, import, etc.). */
export function notifySubjectsListChanged(): void {
	invalidatePageQueryCache();
	try {
		entityVersions.bump('subjects');
	}
	catch {
		// Runes store may be unavailable outside the Svelte client runtime.
	}
}
