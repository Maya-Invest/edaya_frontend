import type { EntityVersionKey } from '$lib/entity-versions.svelte';
import { entityVersions } from '$lib/entity-versions.svelte';
import { toast } from '$lib/toast.svelte';
import { ApiError } from '@maya-invest/edaya-api-client';

export interface NotificationsRouteMutationOptions<T> {
	request: () => Promise<T>;
	apply?: () => void;
	rollback?: () => void;
	errorMessage?: string;
	successMessage?: string;
	onSuccess?: (result: T) => void | Promise<void>;
	versionKeys?: EntityVersionKey[];
}

function messageFromError(error: unknown, fallback?: string): string {
	if (error instanceof ApiError) {
		const body = error.body;
		if (body && typeof body === 'object' && typeof (body as Record<string, unknown>).message === 'string') {
			return (body as Record<string, string>).message;
		}
		return fallback ?? 'La requête a échoué.';
	}
	if (error instanceof Error && error.message.trim().length > 0) {
		return error.message;
	}
	return fallback ?? 'La requête a échoué.';
}

export async function runNotificationsRouteMutation<T>(
	options: NotificationsRouteMutationOptions<T>,
): Promise<T | null> {
	options.apply?.();
	try {
		const result = await options.request();
		await options.onSuccess?.(result);
		for (const key of options.versionKeys ?? []) {
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
