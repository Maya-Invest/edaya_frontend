import type { components } from '$lib/api/schema';
import type { getBrowserSchoolClient } from '$lib/api/school-client';
import type { Subject, Teacher } from '$lib/types/school';
import {
	listAllEntityPagesForIdFilters,
	uniqueIds,
} from '$lib/api/entity-list-filters';
import { safeOptionalEntityList } from '$lib/api/safe-entity-access';
import { loadClassSubjectsByIds } from '$lib/api/subjects-data';
import { fetchAllTeachers } from '$lib/api/teachers-data';
import { mergeById } from '$lib/detail-data/seed-policies';

type SchoolClient = ReturnType<typeof getBrowserSchoolClient>;
type TeacherAssignment = components['schemas']['TeacherAssignment'];

async function listActiveAssignmentsForTeachers(
	client: SchoolClient,
	teacherIds: readonly string[],
	academicYearId: string,
): Promise<TeacherAssignment[]> {
	if (teacherIds.length === 0 || !academicYearId) {
		return [];
	}
	return mergeById([], await safeOptionalEntityList(() =>
		listAllEntityPagesForIdFilters(
			query => client.entities.teacherAssignments.list(query),
			[{ field: 'teacherId', ids: teacherIds }],
			{ extraQuery: { academicYearId, status: 'active' } },
		),
	));
}

export interface TeacherAssignmentsHubData {
	teachers: Teacher[];
	assignments: TeacherAssignment[];
	classSubjects: Subject[];
}

export async function fetchTeacherAssignmentsHubData(
	client: SchoolClient,
	scope: { schoolId: string; academicYearId: string },
): Promise<TeacherAssignmentsHubData> {
	if (!scope.schoolId) {
		return { teachers: [], assignments: [], classSubjects: [] };
	}

	const teachers = await fetchAllTeachers(client, scope);
	const teacherIds = teachers.map(teacher => teacher.id);
	const assignments = scope.academicYearId
		? await listActiveAssignmentsForTeachers(client, teacherIds, scope.academicYearId)
		: [];
	const classSubjectIds = uniqueIds(
		assignments.map(row => row.classSubjectId).filter((id): id is string => Boolean(id)),
	);
	const classSubjects = await loadClassSubjectsByIds(client, classSubjectIds);

	return { teachers, assignments, classSubjects };
}
