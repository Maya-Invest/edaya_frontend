import type { EntityVersionKey } from '$lib/entity-versions.svelte';
import { runRouteMutation } from '$lib/api/mutations/route-mutation';

export interface AttendanceRouteMutationOptions<T> {
	request: () => Promise<T>;
	apply?: () => void;
	rollback?: () => void;
	errorMessage?: string;
	successMessage?: string;
	onSuccess?: (result: T) => void | Promise<void>;
	versionKeys?: EntityVersionKey[];
}

export function runAttendanceRouteMutation<T>(
	options: AttendanceRouteMutationOptions<T>,
): Promise<T | null> {
	return runRouteMutation({
		...options,
		versionKeys: options.versionKeys ?? ['attendance'],
	});
}
