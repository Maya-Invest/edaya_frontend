import { bootstrapAppShell, resetAppShellBootstrap } from '$lib/auth/bootstrap-app';
import { toast } from '$lib/toast.svelte';
import { ApiError } from '@maya-invest/edaya-api-client';

function messageFromApiError(error: ApiError): string | undefined {
	if (error.body && typeof error.body === 'object') {
		const body = error.body as Record<string, unknown>;
		if (typeof body.message === 'string') {
			return body.message;
		}
		if (typeof body.error === 'string') {
			return body.error;
		}
		const nestedError = body.error;
		if (nestedError && typeof nestedError === 'object') {
			const issues = (nestedError as Record<string, unknown>).issues;
			if (Array.isArray(issues)) {
				const firstIssue = issues[0];
				if (firstIssue && typeof firstIssue === 'object' && typeof (firstIssue as Record<string, unknown>).message === 'string') {
					return (firstIssue as Record<string, string>).message;
				}
			}
		}
		if (Array.isArray(body.issues)) {
			const firstIssue = body.issues[0];
			if (firstIssue && typeof firstIssue === 'object' && typeof (firstIssue as Record<string, unknown>).message === 'string') {
				return (firstIssue as Record<string, string>).message;
			}
		}
	}
	return undefined;
}

/** Resets session stores and reloads the app shell (Tier 3 — academic structure changes only). */
export async function refreshAppShellData(): Promise<void> {
	resetAppShellBootstrap();
	await bootstrapAppShell();
}

export async function runMutation<T>(
	fn: () => Promise<T>,
	options?: {
		/** When true, reloads the full app shell after success. Defaults to false. */
		refresh?: boolean;
		/** Apply an optimistic local patch before the request. */
		apply?: () => void;
		/** Revert the optimistic patch when the request fails. */
		rollback?: () => void;
		errorMessage?: string;
		successMessage?: string;
		onSuccess?: (result: T) => void | Promise<void>;
	},
): Promise<T | null> {
	options?.apply?.();
	try {
		const result = await fn();
		if (options?.refresh === true) {
			await refreshAppShellData();
		}
		await options?.onSuccess?.(result);
		if (options?.successMessage) {
			toast.success(options.successMessage);
		}
		return result;
	}
	catch (error) {
		options?.rollback?.();
		if (error instanceof Error && error.message === 'ACTIVE_ENROLLMENTS' && options?.errorMessage) {
			toast.error(options.errorMessage);
			return null;
		}
		const message = error instanceof ApiError
			? (() => {
				const apiMessage = messageFromApiError(error);
				if (apiMessage && /dependent records still exist/i.test(apiMessage) && options?.errorMessage) {
					return options.errorMessage;
				}
				return apiMessage ?? options?.errorMessage ?? 'La requête a échoué.';
			})()
			: error instanceof Error && error.message.trim().length > 0
				? error.message
				: options?.errorMessage ?? 'La requête a échoué.';
		toast.error(message);
		return null;
	}
}
