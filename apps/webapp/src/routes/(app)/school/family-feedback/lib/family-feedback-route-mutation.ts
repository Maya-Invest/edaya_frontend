import type { EntityVersionKey } from '$lib/entity-versions.svelte';
import { runRouteMutation } from '$lib/api/mutations/route-mutation';
import { t } from '$lib/i18n';
import { ApiError } from '@maya-invest/edaya-api-client';
import { get } from 'svelte/store';
import { familyFeedbackErrorKey } from './family-feedback-errors';

export interface FamilyFeedbackRouteMutationOptions<T> {
	request: () => Promise<T>;
	apply?: () => void;
	rollback?: () => void;
	onConflict?: () => Promise<void>;
	errorMessage?: string;
	successMessage?: string;
	onSuccess?: (result: T) => void | Promise<void>;
	versionKeys?: EntityVersionKey[];
}

export function runFamilyFeedbackRouteMutation<T>(
	options: FamilyFeedbackRouteMutationOptions<T>,
): Promise<T | null> {
	return runRouteMutation({
		...options,
		request: async () => {
			try {
				return await options.request();
			}
			catch (error) {
				if (error instanceof ApiError && error.status === 409) {
					// Refresh once for review; never retry a command that may notify families.
					await options.onConflict?.().catch(() => {});
				}
				const key = familyFeedbackErrorKey(error);
				throw key ? new Error(get(t)(key)) : error;
			}
		},
		versionKeys: options.versionKeys ?? ['familyFeedback'],
	});
}
