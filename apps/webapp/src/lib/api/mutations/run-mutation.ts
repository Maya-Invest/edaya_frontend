import type { MutationOptions } from './execute-mutation';
import { bootstrapAppShell, resetAppShellBootstrap } from '$lib/auth/bootstrap-app';
import { runRouteMutation } from './route-mutation';

/** Resets session stores and reloads the app shell (Tier 3 — academic structure changes only). */
export async function refreshAppShellData(): Promise<void> {
	resetAppShellBootstrap();
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
