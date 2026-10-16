import type { getBrowserSchoolClient } from '$lib/api/school-client';
import type { SubjectsPageSlice } from './subjects-helpers';
import { listAllEntityPages, listAllEntityPagesByIds, listAllEntityPagesForIdFilters } from '$lib/api/entity-list-filters';
import { categoryNameById, loadSubjectCategories } from '$lib/api/subject-categories-data';
import { mapCatalogSubjects } from '$lib/api/subjects-data';

export async function loadLevelSubjects(client: ReturnType<typeof getBrowserSchoolClient>, scope: { schoolId: string; levelId: string; academicYearId: string }): Promise<SubjectsPageSlice> {
	const { schoolId, levelId, academicYearId } = scope;
	const gradeLevelSubjectsRaw = await listAllEntityPages(query => client.entities.gradeLevelSubjects.list(query), {
		baseQuery: { gradeLevelId: levelId, academicYearId },
	});
	const [subjectsRaw, gradeLevelSubjectMattersRaw, categories] = await Promise.all([
		listAllEntityPagesByIds(query => client.entities.subjects.list(query), gradeLevelSubjectsRaw.map(row => row.subjectId)),
		listAllEntityPagesForIdFilters(query => client.entities.gradeLevelSubjectMatters.list(query), [{ field: 'gradeLevelSubjectId', ids: gradeLevelSubjectsRaw.map(row => row.id) }]),
		loadSubjectCategories(client, schoolId),
	]);
	const subjectMattersRaw = await listAllEntityPagesByIds(query => client.entities.subjectMatters.list(query), gradeLevelSubjectMattersRaw.map(row => row.subjectMatterId));
	return {
		subjects: mapCatalogSubjects({ gradeLevelSubjectsRaw, subjectsRaw, gradeLevelSubjectMattersRaw, subjectMattersRaw, classSubjectsRaw: [], categoryNameById: categoryNameById(categories) }, {}),
		logEntries: [],
	};
}
