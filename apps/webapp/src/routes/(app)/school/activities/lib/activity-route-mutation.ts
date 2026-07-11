import type { EntityVersionKey } from '$lib/entity-versions.svelte';
import { ApiError } from '@edaya/api-client';
import { entityVersions } from '$lib/entity-versions.svelte';
import { toast } from '$lib/toast.svelte';

export interface ActivityRouteMutationOptions<T> {
	request: () => Promise<T>;
	apply?: () => void;
	rollback?: () => void;
	errorMessage?: string;
	successMessage?: string;
	onSuccess?: (result: T) => void | Promise<void>;
	versionKeys?: EntityVersionKey[];
}

function messageFromApiError(error: ApiError): string | undefined {
	if (error.body && typeof error.body === 'object') {
		const body = error.body as Record<string, unknown>;
		if (typeof body.message === 'string') {
			return body.message;
		}
		if (typeof body.error === 'string') {
			return body.error;
		}
	}
	return undefined;
}

function messageFromError(error: unknown, fallback?: string): string {
	if (error instanceof ApiError) {
		return messageFromApiError(error) ?? fallback ?? 'La requête a échoué.';
	}
	if (error instanceof Error && error.message.trim().length > 0) {
		return error.message;
	}
	return fallback ?? 'La requête a échoué.';
}

export async function runActivityRouteMutation<T>(
	options: ActivityRouteMutationOptions<T>,
): Promise<T | null> {
	options.apply?.();
	try {
		const result = await options.request();
		await options.onSuccess?.(result);
		for (const key of options.versionKeys ?? ['activities']) {
			entityVersions.bump(key);
		}
		if (options.successMessage) {
			toast.success(options.successMessage);
		}
		return result;
	}
	catch (error) {
		options.rollback?.();
		toast.error(messageFromError(error, options.errorMessage));
		return null;
	}
}
