import type { SchoolPageState } from '../school-page.svelte';
import { getBrowserSchoolClient } from '$lib/api/school-client';
import { fetchCurrentSchoolProfile } from '$lib/api/school-profile-data';
import { resolvePageLoad } from '$lib/queries/page-status';
import { emptySchoolSlice } from './school-helpers';

export async function loadSchoolSlice() {
	const client = getBrowserSchoolClient();
	return fetchCurrentSchoolProfile(client);
}

export function querySchoolListPage(state: SchoolPageState) {
	return (url: URL) => resolvePageLoad(url, {
		empty: () => emptySchoolSlice(),
		load: async () => {
			const data = await loadSchoolSlice();
			state.applySlice(data);
			return data;
		},
		hasItems: data => Boolean(data.school),
		errorMessage: 'Unable to load school settings.',
	});
}
