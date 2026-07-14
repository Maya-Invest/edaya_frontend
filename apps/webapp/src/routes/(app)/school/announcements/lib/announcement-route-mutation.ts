import type { EntityVersionKey } from '$lib/entity-versions.svelte';
import { entityVersions } from '$lib/entity-versions.svelte';
import { toast } from '$lib/toast.svelte';
import { ApiError } from '@maya-invest/edaya-api-client';

export interface AnnouncementRouteMutationOptions<T> {
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

export async function runAnnouncementRouteMutation<T>(
	options: AnnouncementRouteMutationOptions<T>,
): Promise<T | null> {
	options.apply?.();
	try {
		const result = await options.request();
		await options.onSuccess?.(result);
		for (const key of options.versionKeys ?? ['announcements']) {
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
