import type { components } from '$lib/api/schema';
import type { getBrowserSchoolClient } from '$lib/api/school-client';
import type { Teacher } from '$lib/types/school';
import {
	DEFAULT_LIST_PAGE_SIZE,
	paginatedList,
	teacherAssignmentsForTeachers,
	uniqueIds,
} from '$lib/api/entity-list-filters';
import { safeOptionalEntityList } from '$lib/api/safe-entity-access';
import { formatPersonName } from '$lib/api/teacher-display';
import { ApiError } from '@maya-invest/edaya-api-client';

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
		code: member.code ?? member.id,
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
	/** When false, list loads teachers only — assignment counts come from the assignments tab. */
	includeAssignments?: boolean;
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
	const includeAssignments = request.includeAssignments ?? false;
	if (!includeAssignments) {
		return {
			teachers: mapTeachers(teachersRaw ?? []),
			totalTeachers,
			assignments: [],
		};
	}

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

export async function fetchTeacherById(
	client: SchoolClient,
	teacherId: string,
): Promise<Teacher | null> {
	try {
		const teacherRaw = await client.entities.teachers.get(teacherId);
		return mapTeacher(teacherRaw);
	}
	catch (error) {
		if (error instanceof ApiError && (error.status === 401 || error.status === 403 || error.status === 404)) {
			return null;
		}
		throw error;
	}
}
