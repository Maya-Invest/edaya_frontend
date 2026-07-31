import { getBrowserSchoolClient } from '$lib/api/school-client';
import { fetchAppShellData } from '$lib/api/shell-data';
import { authSession } from '$lib/auth/session.svelte';

export async function getAppShellData() {
	return fetchAppShellData(getBrowserSchoolClient(), {
		fallbackSchoolId: authSession.schoolId,
	});
}
