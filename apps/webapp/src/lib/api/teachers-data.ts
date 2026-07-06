import type { components } from '$lib/api/schema';
import type { getBrowserSchoolClient } from '$lib/api/school-client';
import type { Teacher } from '$lib/types/school';
import {
	DEFAULT_LIST_PAGE_SIZE,
	paginatedList,
	teacherAssignmentsForTeachers,
	uniqueIds,
} from '$lib/api/entity-list-filters';
import { formatPersonName } from '$lib/api/teacher-display';
import { safeOptionalEntityList } from '$lib/api/safe-entity-access';

type SchoolClient = ReturnType<typeof getBrowserSchoolClient>;
type TeacherRaw = components['schemas']['Teacher'];
type TeacherAssignmentRaw = components['schemas']['TeacherAssignment'];

const TEACHER_LIST_ORDER = [{ field: 'lastName', direction: 'asc' as const }, { field: 'firstName', direction: 'asc' as const }];

function teacherInitials(firstName: string, lastName: string): string {
	return `${firstName.trim()[0] ?? ''}${lastName.trim()[0] ?? ''}`;
}

export function mapTeacher(member: TeacherRaw): Teacher {
	return {
		id: member.id,
		name: formatPersonName(member.firstName, member.lastName),
		initials: teacherInitials(member.firstName, member.lastName),
		photoUrl: member.photoUrl ?? null,
		email: member.email ?? '',
		phone: member.phone ?? '',
		isActive: member.isActive ?? true,
		subjectId: member.subjectId ?? null,
	};
}

export function mapTeachers(members: readonly TeacherRaw[]): Teacher[] {
	return members.map(mapTeacher);
}

export interface TeachersPageRequest {
	offset?: number;
	limit?: number;
}

export interface PaginatedTeachersData {
	teachers: Teacher[];
	totalTeachers: number;
	assignments: TeacherAssignmentRaw[];
}

export async function fetchTeachersPage(
	client: SchoolClient,
	scope: { schoolId: string; academicYearId: string },
	request: TeachersPageRequest = {},
): Promise<PaginatedTeachersData> {
	const limit = request.limit ?? DEFAULT_LIST_PAGE_SIZE;
	const offset = request.offset ?? 0;
	const teacherFilter = paginatedList({ schoolId: scope.schoolId }, {
		limit,
		offset,
		orderBy: TEACHER_LIST_ORDER,
	});

	const [teachersRaw, totalTeachers] = await Promise.all([
		client.entities.teachers.list(teacherFilter),
		client.entities.teachers.count({ schoolId: scope.schoolId }).then(result => result.count),
	]);
	const teacherIds = uniqueIds((teachersRaw ?? []).map(member => member.id));
	if (teacherIds.length === 0) {
		return { teachers: [], totalTeachers, assignments: [] };
	}

	const assignmentsRaw = await safeOptionalEntityList(() =>
		client.entities.teacherAssignments.list({
			...teacherAssignmentsForTeachers(teacherIds),
			academicYearId: scope.academicYearId,
			status: 'active',
		}));

	return {
		teachers: mapTeachers(teachersRaw ?? []),
		totalTeachers,
		assignments: assignmentsRaw,
	};
}
