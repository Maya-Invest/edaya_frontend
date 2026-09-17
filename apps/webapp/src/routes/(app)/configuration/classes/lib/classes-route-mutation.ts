import { runRouteMutation } from '$lib/api/mutations/route-mutation';

export interface ClassesRouteMutationOptions<T> {
	request: () => Promise<T>;
	apply?: () => void;
	rollback?: () => void;
	errorMessage?: string;
	successMessage?: string;
	onSuccess?: (result: T) => void | Promise<void>;
}

export function runClassesRouteMutation<T>(
	options: ClassesRouteMutationOptions<T>,
): Promise<T | null> {
	return runRouteMutation({
		...options,
	});
}
