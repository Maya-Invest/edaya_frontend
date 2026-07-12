import { refreshAppShellData } from '$lib/api/mutations/run-mutation';

export async function notifyClassesListChanged(): Promise<void> {
	try {
		await refreshAppShellData();
	}
	catch {
		// Import succeeded; shell refresh is best-effort.
	}
}
