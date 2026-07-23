import type { SubjectsPageSlice } from './subjects-helpers';
import { getBrowserSchoolClient } from '$lib/api/school-client';
import {
	fetchCatalogSubjectsSources,
	fetchSchoolSubjectsSources,
	mapAllClassSubjects,
	mapCatalogSubjects,
} from '$lib/api/subjects-data';
import { listAllEntityPages, schoolWideEntityList } from '$lib/api/entity-list-filters';
import { fetchTeachingLogEntries } from '$lib/api/teaching-log-data';
import { resolvePageLoad } from '$lib/queries/page-status';
import { emptySubjectsSlice } from './subjects-helpers';

async function classGradeLevelById(client: ReturnType<typeof getBrowserSchoolClient>): Promise<Record<string, string>> {
	const classGroups = await listAllEntityPages(
		query => client.entities.classGroups.list(query),
		{
			baseQuery: schoolWideEntityList(
				'Configuration subjects catalog maps class groups to grade levels.',
			),
		},
	);
	return Object.fromEntries(classGroups.map(classGroup => [classGroup.id, classGroup.gradeLevelId]));
}

export async function loadSubjectsSlice(): Promise<SubjectsPageSlice> {
	const client = getBrowserSchoolClient();
	const gradeLevelByClassId = await classGradeLevelById(client);
	const catalogSources = await fetchCatalogSubjectsSources(client);
	const catalogSubjects = mapCatalogSubjects(catalogSources, gradeLevelByClassId);

	if (catalogSubjects.length > 0) {
		return {
			subjects: catalogSubjects,
			logEntries: [],
		};
	}

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
