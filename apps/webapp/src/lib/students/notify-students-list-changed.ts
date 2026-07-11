import { entityVersions } from '$lib/entity-versions.svelte';
import { invalidatePageQueryCache } from '$lib/queries/page-query-cache';

/** Notify list routes that student roster data changed (create, import, enrollment, etc.). */
export function notifyStudentsListChanged(): void {
	invalidatePageQueryCache();
	try {
		entityVersions.bump('students');
		entityVersions.bump('enrollments');
	}
	catch {
		// Runes store may be unavailable outside the Svelte client runtime.
	}
}
