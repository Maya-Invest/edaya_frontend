import { bootstrapAppShell, invalidateAppShellBootstrapCache } from '$lib/auth/bootstrap-app';

/** Reload shell classes (names, capacities, enrollment counts) before student import validation. */
export async function refreshStudentImportShellContext(): Promise<void> {
	try {
		// Keep the mounted import wizard and its parsed rows while refreshing classes.
		// Resetting the session shell here unmounts the wizard during validation.
		invalidateAppShellBootstrapCache();
		await bootstrapAppShell();
	}
	catch {
		// Best-effort: validation can still run with the cached shell classes.
	}
}
