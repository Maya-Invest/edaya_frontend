import { getBrowserSchoolClient } from '$lib/api/school-client';
import { fetchAppShellData } from '$lib/api/shell-data';

export async function getAppShellData() {
	return fetchAppShellData(getBrowserSchoolClient());
}
