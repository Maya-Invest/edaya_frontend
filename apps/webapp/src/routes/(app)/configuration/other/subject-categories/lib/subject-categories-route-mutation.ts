import type { EntityVersionKey } from '$lib/entity-versions.svelte';
import { runRouteMutation } from '$lib/api/mutations/route-mutation';

export function runSubjectCategoriesRouteMutation<T>(options: {
	request: () => Promise<T>;
	apply?: () => void;
	rollback?: () => void;
	successMessage?: string;
	versionKeys?: EntityVersionKey[];
}): Promise<T | null> {
	return runRouteMutation({
		...options,
		versionKeys: options.versionKeys ?? ['subjects'],
	});
}
