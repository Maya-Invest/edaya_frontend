import type { TeachingPageSlice } from './teaching-helpers';
import { getBrowserSchoolClient } from '$lib/api/school-client';
import { loadClassSubjects } from '$lib/api/subjects-data';
import { fetchTeachingLogEntries } from '$lib/api/teaching-log-data';
import { resolvePageLoad } from '$lib/queries/page-status';
import { emptyTeachingSlice } from './teaching-helpers';

export async function loadTeachingSlice(classId: string): Promise<TeachingPageSlice> {
	const client = getBrowserSchoolClient();
	const [subjects, logEntries] = await Promise.all([
		loadClassSubjects(client, classId),
		fetchTeachingLogEntries(classId, client),
	]);
	return {
		classId,
		subjects,
		logEntries,
	};
}

export function queryTeachingListPage(classId: string) {
	return (url: URL) => resolvePageLoad(url, {
		empty: () => emptyTeachingSlice(classId),
		load: () => loadTeachingSlice(classId),
		hasItems: () => true,
	});
}
