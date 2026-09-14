import type { EntityVersionKey } from '$lib/entity-versions.svelte';
import { runRouteMutation } from '$lib/api/mutations/route-mutation';

export interface FinanceRouteMutationOptions<T> {
	request: () => Promise<T>;
	apply?: () => void;
	rollback?: () => void;
	errorMessage?: string;
	successMessage?: string;
	onSuccess?: (result: T) => void | Promise<void>;
	versionKeys?: EntityVersionKey[];
}

export function runFinanceRouteMutation<T>(
	options: FinanceRouteMutationOptions<T>,
): Promise<T | null> {
	return runRouteMutation({
		...options,
		versionKeys: options.versionKeys ?? ['billing'],
	});
}
