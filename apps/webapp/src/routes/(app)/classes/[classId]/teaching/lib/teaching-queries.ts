import type { PageQueryRequest } from '$lib/queries/page-status';
import type { TeachingPageSlice } from './teaching-helpers';
import { getBrowserSchoolClient } from '$lib/api/school-client';
import { loadClassSubjects } from '$lib/api/subjects-data';
import { resolvePageLoad } from '$lib/queries/page-status';
import { emptyTeachingSlice, teachingClassIdFromUrl } from './teaching-helpers';

export async function loadTeachingSlice(classId: string): Promise<TeachingPageSlice> {
	const client = getBrowserSchoolClient();
	const subjects = await loadClassSubjects(client, classId);
	return { classId, subjects };
}

export function queryTeachingListPage() {
	return (url: URL, request?: PageQueryRequest) => {
		const classId = teachingClassIdFromUrl(url) ?? '';
		return resolvePageLoad(url, {
			empty: () => emptyTeachingSlice(classId),
			load: () => classId ? loadTeachingSlice(classId) : Promise.resolve(emptyTeachingSlice(classId)),
			hasItems: () => true,
		}, request);
	};
}
