import type { MutationOptions } from './execute-mutation';
import { entityVersions } from '$lib/entity-versions.svelte';
import { t } from '$lib/i18n';
import { toast } from '$lib/toast.svelte';
import { get } from 'svelte/store';
import { executeMutation } from './execute-mutation';

export function runRouteMutation<T>(options: MutationOptions<T>): Promise<T | null> {
	return executeMutation(options, {
		bump: key => entityVersions.bump(key),
		success: message => toast.success(message),
		error: message => toast.error(message),
		translate: key => get(t)(key),
	});
}
