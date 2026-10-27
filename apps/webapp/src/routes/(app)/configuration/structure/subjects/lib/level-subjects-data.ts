import type { getBrowserSchoolClient } from '$lib/api/school-client';
import type { SubjectsPageSlice } from './subjects-helpers';
import { listAllEntityPagesForIdFilters } from '$lib/api/entity-list-filters';
import { mapCatalogSubjects } from '$lib/api/subjects-data';
import { hasAnyPermission } from '$lib/permissions';

export async function loadLevelSubjects(client: ReturnType<typeof getBrowserSchoolClient>, scope: { schoolId: string; levelId: string; academicYearId: string }): Promise<SubjectsPageSlice> {
	const configuration = await client.queries.getReportConfiguration({ gradeLevelId: scope.levelId, academicYearId: scope.academicYearId });
	const subjectsRaw = configuration.subjects;
	const subjectMattersRaw = hasAnyPermission(['ACADEMIC_PROGRAM_READ', 'ACADEMIC_PROGRAM_MANAGE'], { gradeLevelId: scope.levelId })
		? await listAllEntityPagesForIdFilters(query => client.entities.subjectMatters.list(query), [{ field: 'subjectId', ids: subjectsRaw.map(row => row.id) }])
		: [];
	return { configuration, subjects: mapCatalogSubjects({ subjectsRaw, subjectMattersRaw, classSubjectsRaw: [], categoryNameById: Object.fromEntries(subjectsRaw.map(row => [row.categoryId, row.categoryName ?? ''])) }), logEntries: [] };
}
