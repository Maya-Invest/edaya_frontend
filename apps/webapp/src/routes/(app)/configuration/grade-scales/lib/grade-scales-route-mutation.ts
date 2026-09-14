import type { EntityVersionKey } from '$lib/entity-versions.svelte';
import { runRouteMutation } from '$lib/api/mutations/route-mutation';

export interface GradeScalesRouteMutationOptions<T> {
	request: () => Promise<T>;
	apply?: () => void;
	rollback?: () => void;
	errorMessage?: string;
	successMessage?: string;
	onSuccess?: (result: T) => void | Promise<void>;
	versionKeys?: EntityVersionKey[];
}

export function runGradeScalesRouteMutation<T>(
	options: GradeScalesRouteMutationOptions<T>,
): Promise<T | null> {
	return runRouteMutation({
		...options,
		versionKeys: options.versionKeys ?? ['reportCards'],
	});
}
