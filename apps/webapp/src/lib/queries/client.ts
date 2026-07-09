import { getBrowserSchoolClient } from '$lib/api/school-client';

export function queryClient() {
	return getBrowserSchoolClient();
}
