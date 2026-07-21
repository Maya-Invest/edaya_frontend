import { refreshAppShellData } from '$lib/api/mutations/run-mutation';

/** Reload shell classes (names, capacities, enrollment counts) before student import validation. */
export async function refreshStudentImportShellContext(): Promise<void> {
	try {
		await refreshAppShellData();
	}
	catch {
		// Best-effort: validation can still run with the cached shell classes.
	}
}
