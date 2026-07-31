import type { components } from '$lib/api/schema';
import type { getBrowserSchoolClient } from '$lib/api/school-client';
import type { Subject, Teacher } from '$lib/types/school';
import {
	DEFAULT_LIST_PAGE_SIZE,
	teacherAssignmentsForTeachers,
	uniqueIds,
} from '$lib/api/entity-list-filters';
import { safeOptionalEntityList } from '$lib/api/safe-entity-access';
import { loadClassSubjectsByIds } from '$lib/api/subjects-data';
import { fetchTeachersPage } from '$lib/api/teachers-data';
import { mergeById } from '$lib/detail-data/seed-policies';

type SchoolClient = ReturnType<typeof getBrowserSchoolClient>;
type TeacherAssignment = components['schemas']['TeacherAssignment'];

const TEACHER_ID_BATCH = DEFAULT_LIST_PAGE_SIZE;

function chunkIds(ids: readonly string[], size: number): string[][] {
	const chunks: string[][] = [];
	for (let index = 0; index < ids.length; index += size) {
		chunks.push(ids.slice(index, index + size));
	}
	return chunks;
}

async function listActiveAssignmentsForTeachers(
	client: SchoolClient,
	teacherIds: readonly string[],
	academicYearId: string,
): Promise<TeacherAssignment[]> {
	if (teacherIds.length === 0 || !academicYearId) {
		return [];
	}
	const batches = chunkIds(teacherIds, TEACHER_ID_BATCH);
	const batchResults = await Promise.all(
		batches.map(batch =>
			safeOptionalEntityList(() =>
				client.entities.teacherAssignments.list({
					...teacherAssignmentsForTeachers(batch),
					academicYearId,
					status: 'active',
				}),
			),
		),
	);
	return mergeById([], batchResults.flat());
}

async function fetchAllTeachers(
	client: SchoolClient,
	scope: { schoolId: string; academicYearId: string },
): Promise<Teacher[]> {
	let offset = 0;
	let total = 0;
	let teachers: Teacher[] = [];

	while (true) {
		const page = await fetchTeachersPage(client, scope, { offset, limit: DEFAULT_LIST_PAGE_SIZE });
		total = page.totalTeachers;
		teachers = mergeById(teachers, page.teachers);
		if (teachers.length >= total) {
			break;
		}
		offset += DEFAULT_LIST_PAGE_SIZE;
	}

	return teachers;
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
