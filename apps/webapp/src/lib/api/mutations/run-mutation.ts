import type { MutationOptions } from './execute-mutation';
import { bootstrapAppShell, invalidateAppShellBootstrapCache } from '$lib/auth/bootstrap-app';
import { runRouteMutation } from './route-mutation';

/** Refresh shell-shaped data without discarding mounted route state or form drafts. */
export async function refreshAppShellData(): Promise<void> {
	invalidateAppShellBootstrapCache();
	await bootstrapAppShell();
}

export function runMutation<T>(
	fn: () => Promise<T>,
	options?: Omit<MutationOptions<T>, 'request'> & {
		/** Reload shell-shaped data after a confirmed write. */
		refresh?: boolean;
	},
): Promise<T | null> {
	return runRouteMutation({
		...options,
		request: fn,
		onSuccess: async (result) => {
			if (options?.refresh === true) {
				await refreshAppShellData();
			}
			await options?.onSuccess?.(result);
		},
	});
}
