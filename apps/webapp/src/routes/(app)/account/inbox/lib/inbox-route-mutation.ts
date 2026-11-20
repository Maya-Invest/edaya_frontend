import { runRouteMutation } from '$lib/api/mutations/route-mutation';

export interface InboxRouteMutationOptions<T> {
	request: () => Promise<T>;
	apply?: () => void;
	rollback?: () => void;
	errorMessage?: string;
	successMessage?: string;
	onSuccess?: (result: T) => void | Promise<void>;
}

export function runInboxRouteMutation<T>(
	options: InboxRouteMutationOptions<T>,
): Promise<T | null> {
	return runRouteMutation({
		...options,
	});
}
