import { fetchSchoolSubjectsSources, loadClassSubjects, mapAllClassSubjects } from '$lib/api/subjects-data';
import { fetchTeachingLogEntries } from '$lib/api/teaching-log-data';
import { detailDataContext } from '$lib/detail-data/context.svelte';
import { queryClient } from '$lib/queries/client';
import { resolvePageLoad, listPageHasItems } from '$lib/queries/page-status';
import { teachingLogContext } from '$lib/teaching-log/context.svelte';

export async function getClassSubjects(classId: string) {
	return loadClassSubjects(queryClient(), classId);
}

export async function getAllSubjects() {
	if (detailDataContext.subjects.length > 0) {
		return detailDataContext.subjects;
	}
	const sources = await fetchSchoolSubjectsSources(queryClient());
	const subjects = mapAllClassSubjects(sources);
	const classIds = [...new Set(subjects.map(subject => subject.classId))];
	for (const classId of classIds) {
		detailDataContext.seedSubjects(
			subjects.filter(subject => subject.classId === classId),
			{ classId },
		);
	}
	return subjects;
}

export function queryClassSubjectsPage(classId: string) {
	return (url: URL) => resolvePageLoad(url, {
		empty: () => ({ classId }),
		load: async () => {
			const subjects = await getClassSubjects(classId);
			detailDataContext.seedSubjects(subjects, { classId });
			return { classId };
		},
		hasItems: listPageHasItems,
	});
}

export function queryClassTeachingPage(classId: string) {
	return (url: URL) => resolvePageLoad(url, {
		empty: () => ({ classId }),
		load: async () => {
			const [subjects, entries] = await Promise.all([
				getClassSubjects(classId),
				fetchTeachingLogEntries(classId, queryClient()),
			]);
			detailDataContext.seedSubjects(subjects, { classId });
			teachingLogContext.hydrateFromServer(entries);
			return { classId };
		},
		hasItems: listPageHasItems,
	});
}

export function queryConfigSubjectsPage() {
	return (url: URL) => resolvePageLoad(url, {
		empty: () => ({}),
		load: async () => {
			await getAllSubjects();
			return {};
		},
		hasItems: listPageHasItems,
	});
}
