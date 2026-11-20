import type { EntityVersionKey } from '$lib/entity-versions.svelte';
import type { ActivitiesPageState } from '../activities-page.svelte';
import { runRouteMutation } from '$lib/api/mutations/route-mutation';
import { entityVersions } from '$lib/entity-versions.svelte';
import { runSelectionOperation } from '$lib/interaction/selection-operation';

export interface ActivityRouteMutationOptions<T> {
	request: () => Promise<T>;
	apply?: () => void;
	rollback?: () => void;
	errorMessage?: string;
	successMessage?: string;
	onSuccess?: (result: T) => void | Promise<void>;
	versionKeys?: EntityVersionKey[];
}

export async function runActivityRouteMutation<T>(
	state: ActivitiesPageState,
	options: ActivityRouteMutationOptions<T>,
	recordMembershipSave?: () => void,
): Promise<T | null> {
	const scope = state.scope;
	const result = await runRouteMutation({
		...options,
		rollback: () => {
			if (scope === state.scope)
				options.rollback?.();
		},
		versionKeys: recordMembershipSave ? [] : options.versionKeys ?? ['activities'],
	});
	if (result !== null) {
		if (recordMembershipSave)
			recordMembershipSave();
		else if (scope === state.scope)
			void state.refreshAfterMutation().catch(() => {});
	}
	return result;
}

export async function saveActivityMembershipSelection(
	state: ActivitiesPageState,
	ids: readonly string[],
	save: (id: string, recordSave: () => void) => Promise<boolean>,
	isCurrent: () => boolean,
) {
	const scope = state.scope;
	let changed = false;
	const recordSave = () => {
		changed = true;
	};
	try {
		return await runSelectionOperation(ids, id => save(id, recordSave), isCurrent);
	}
	finally {
		if (changed) {
			entityVersions.bump('activities');
			if (scope === state.scope)
				void state.refreshAfterMutation().catch(() => {});
		}
	}
}
