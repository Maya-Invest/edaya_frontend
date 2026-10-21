import type { getBrowserSchoolClient } from '$lib/api/school-client';
import type { SubjectsPageSlice } from './subjects-helpers';
import { listAllEntityPages, listAllEntityPagesForIdFilters } from '$lib/api/entity-list-filters';
import { categoryNameById, loadSubjectCategories } from '$lib/api/subject-categories-data';
import { mapCatalogSubjects } from '$lib/api/subjects-data';

export async function loadLevelSubjects(client: ReturnType<typeof getBrowserSchoolClient>, scope: { schoolId: string; levelId: string; academicYearId: string }): Promise<SubjectsPageSlice> {
	const subjectsRaw = await listAllEntityPages(query => client.entities.subjects.list(query), {
		baseQuery: { schoolId: scope.schoolId, gradeLevelId: scope.levelId, academicYearId: scope.academicYearId },
	});
	const [subjectMattersRaw, categories] = await Promise.all([
		listAllEntityPagesForIdFilters(query => client.entities.subjectMatters.list(query), [{ field: 'subjectId', ids: subjectsRaw.map(row => row.id) }]),
		loadSubjectCategories(client, scope.schoolId),
	]);
	return { subjects: mapCatalogSubjects({ subjectsRaw, subjectMattersRaw, classSubjectsRaw: [], categoryNameById: categoryNameById(categories) }), logEntries: [] };
}
