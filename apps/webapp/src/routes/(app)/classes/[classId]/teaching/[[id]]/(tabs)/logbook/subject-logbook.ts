import type { PageQueryRequest } from '$lib/queries/page-status';
import { fetchTeachingLogEntries } from '$lib/api/teaching-log-data';
import { resolvePageLoad } from '$lib/queries/page-status';

export function querySubjectLogbook(classGroupId: string, classSubjectId: string) {
	return (url: URL, request?: PageQueryRequest) => resolvePageLoad(url, {
		empty: () => ({ entries: [] }),
		load: async () => ({ entries: await fetchTeachingLogEntries(classGroupId, undefined, { classSubjectId }) }),
		hasItems: () => true,
	}, request);
}
