import type { SubjectsPageSlice } from './subjects-helpers';
import { getBrowserSchoolClient } from '$lib/api/school-client';
import { fetchSchoolSubjectsSources, mapAllClassSubjects } from '$lib/api/subjects-data';
import { fetchTeachingLogEntries } from '$lib/api/teaching-log-data';
import { resolvePageLoad } from '$lib/queries/page-status';
import { emptySubjectsSlice } from './subjects-helpers';

export async function loadSubjectsSlice(): Promise<SubjectsPageSlice> {
	const client = getBrowserSchoolClient();
	const sources = await fetchSchoolSubjectsSources(client);
	const subjects = mapAllClassSubjects(sources);
	const classIds = [...new Set(subjects.map(subject => subject.classId))];
	const logEntrySets = await Promise.all(
		classIds.map(classId => fetchTeachingLogEntries(classId, client)),
	);
	return {
		subjects,
		logEntries: logEntrySets.flat(),
	};
}

export function querySubjectsListPage() {
	return (url: URL) => resolvePageLoad(url, {
		empty: () => emptySubjectsSlice(),
		load: () => loadSubjectsSlice(),
		hasItems: () => true,
	});
}
