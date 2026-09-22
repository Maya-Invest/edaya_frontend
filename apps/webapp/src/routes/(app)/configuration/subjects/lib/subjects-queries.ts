import type { PageQueryRequest } from '$lib/queries/page-status';
import type { SubjectsPageSlice } from './subjects-helpers';
import { academicContext } from '$lib/academic/context.svelte';
import { listAllEntityPages, schoolScopedEntityList } from '$lib/api/entity-list-filters';
import { getBrowserSchoolClient } from '$lib/api/school-client';
import {
	fetchCatalogSubjectsSources,
	fetchSchoolSubjectsSources,
	mapAllClassSubjects,
	mapCatalogSubjects,
} from '$lib/api/subjects-data';
import { fetchTeachingLogEntries } from '$lib/api/teaching-log-data';
import { authSession } from '$lib/auth/session.svelte';
import { resolvePageLoad } from '$lib/queries/page-status';
import { emptySubjectsSlice } from './subjects-helpers';

async function classGradeLevelById(
	client: ReturnType<typeof getBrowserSchoolClient>,
	schoolId: string,
): Promise<Record<string, string>> {
	const classGroups = await listAllEntityPages(
		query => client.entities.classGroups.list(query),
		{
			baseQuery: schoolScopedEntityList(
				schoolId,
				'Configuration subjects catalog maps class groups to grade levels.',
			),
		},
	);
	return Object.fromEntries(classGroups.map(classGroup => [classGroup.id, classGroup.gradeLevelId]));
}

export async function loadSubjectsSlice(): Promise<SubjectsPageSlice> {
	const schoolId = authSession.schoolId ?? academicContext.schools[0]?.id ?? null;
	if (!schoolId) {
		return emptySubjectsSlice();
	}

	const client = getBrowserSchoolClient();
	const gradeLevelByClassId = await classGradeLevelById(client, schoolId);
	const catalogSources = await fetchCatalogSubjectsSources(client, schoolId);
	const catalogSubjects = mapCatalogSubjects(catalogSources, gradeLevelByClassId);

	if (catalogSubjects.length > 0) {
		return {
			subjects: catalogSubjects,
			logEntries: [],
		};
	}

	const sources = await fetchSchoolSubjectsSources(client, schoolId);
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
	return (url: URL, request?: PageQueryRequest) => resolvePageLoad(url, {
		empty: () => emptySubjectsSlice(),
		load: () => loadSubjectsSlice(),
		hasItems: () => true,
	}, request);
}
