import { runRouteMutation } from '$lib/api/mutations/route-mutation';

export interface GradeLevelsRouteMutationOptions<T> {
	request: () => Promise<T>;
	apply?: () => void;
	rollback?: () => void;
	errorMessage?: string;
	successMessage?: string;
	onSuccess?: (result: T) => void | Promise<void>;
}

export function runGradeLevelsRouteMutation<T>(
	options: GradeLevelsRouteMutationOptions<T>,
): Promise<T | null> {
	return runRouteMutation({
		...options,
	});
}
