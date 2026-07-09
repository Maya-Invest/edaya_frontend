import type { components } from '$lib/api/schema';
import type { getBrowserSchoolClient } from '$lib/api/school-client';
import {
	assignmentsForClassSubjects,
	entitiesByIds,
	teacherAssignmentsForClassSubjects,
	uniqueIds,
} from '$lib/api/entity-list-filters';
import { safeOptionalEntityList } from '$lib/api/safe-entity-access';

type SchoolClient = ReturnType<typeof getBrowserSchoolClient>;

export type TeacherRaw = components['schemas']['Teacher'];
export type TeacherAssignmentRaw = components['schemas']['TeacherAssignment'];
export type StaffMemberRaw = components['schemas']['StaffMember'];
export type StaffAssignmentRaw = components['schemas']['StaffAssignment'];

export type TeacherNameLookup
	= | Pick<TeacherRaw, 'id' | 'firstName' | 'lastName'>
		| { id: string; name: string };

function resolveTeacherName(teacher: TeacherNameLookup): string {
	if ('name' in teacher) {
		return teacher.name;
	}
	return formatPersonName(teacher.firstName, teacher.lastName);
}

export interface ClassSubjectInstructorSources {
	teachersRaw: TeacherNameLookup[];
	teacherAssignmentsRaw: TeacherAssignmentRaw[];
	staffMembersRaw: StaffMemberRaw[];
	staffAssignmentsRaw: StaffAssignmentRaw[];
}

export function formatPersonName(firstName: string, lastName: string): string {
	return `${firstName} ${lastName}`.trim();
}

export function teacherNameForClassSubject(
	classSubjectId: string,
	sources: ClassSubjectInstructorSources,
	fallback = 'Non assigné',
): string {
	const teacherAssignments = sources.teacherAssignmentsRaw ?? [];
	const staffAssignments = sources.staffAssignmentsRaw ?? [];
	const teachers = sources.teachersRaw ?? [];
	const staffMembers = sources.staffMembersRaw ?? [];

	const teacherAssignment = teacherAssignments.find(
		entry => entry.kind === 'subject' && entry.classSubjectId === classSubjectId,
	);
	if (teacherAssignment) {
		const teacher = teachers.find(entry => entry.id === teacherAssignment.teacherId);
		if (teacher) {
			return resolveTeacherName(teacher);
		}
	}

	const staffAssignment = staffAssignments.find(
		entry => entry.classSubjectId === classSubjectId,
	);
	if (staffAssignment) {
		const staff = staffMembers.find(member => member.id === staffAssignment.staffId);
		if (staff) {
			return formatPersonName(staff.firstName, staff.lastName);
		}
	}

	return fallback;
}

export function instructorNameFromStaffAssignment(
	staffAssignments: StaffAssignmentRaw[],
	staffById: Map<string, StaffMemberRaw>,
	match: (assignment: StaffAssignmentRaw) => boolean,
	fallback = 'Non assigné',
): string {
	const assignment = staffAssignments.find(match);
	const staff = assignment ? staffById.get(assignment.staffId) : undefined;
	return staff ? formatPersonName(staff.firstName, staff.lastName) : fallback;
}

export function instructorName(
	sources: ClassSubjectInstructorSources,
	options: {
		classSubjectId?: string;
		staffMatch?: (assignment: StaffAssignmentRaw) => boolean;
	},
	fallback = 'Non assigné',
): string {
	if (options.classSubjectId) {
		const fromSubject = teacherNameForClassSubject(options.classSubjectId, sources, '');
		if (fromSubject) {
			return fromSubject;
		}
	}

	if (options.staffMatch) {
		const staffById = new Map(sources.staffMembersRaw.map(member => [member.id, member]));
		const fromSession = instructorNameFromStaffAssignment(
			sources.staffAssignmentsRaw,
			staffById,
			options.staffMatch,
			'',
		);
		if (fromSession) {
			return fromSession;
		}
	}

	return fallback;
}

export function portalHomeroomTeacherNameForClass(
	classGroupId: string,
	sources: Pick<ClassSubjectInstructorSources, 'teachersRaw' | 'teacherAssignmentsRaw'>,
	fallback = '—',
): string {
	const assignment = sources.teacherAssignmentsRaw.find(
		entry => entry.kind === 'homeroom'
			&& entry.classGroupId === classGroupId
			&& entry.status === 'active',
	);
	if (!assignment) {
		return fallback;
	}

	const teacher = sources.teachersRaw.find(entry => entry.id === assignment.teacherId);
	return teacher ? resolveTeacherName(teacher) : fallback;
}

export async function fetchClassSubjectInstructorSources(
	client: SchoolClient,
	classSubjectIds: readonly string[],
): Promise<Pick<ClassSubjectInstructorSources, 'teachersRaw' | 'teacherAssignmentsRaw'>> {
	if (classSubjectIds.length === 0) {
		return { teachersRaw: [], teacherAssignmentsRaw: [] };
	}

	const teacherAssignmentsRaw = (await safeOptionalEntityList(() =>
		client.entities.teacherAssignments.list(teacherAssignmentsForClassSubjects(classSubjectIds)),
	)) ?? [];
	const teacherIds = uniqueIds(teacherAssignmentsRaw.map(assignment => assignment.teacherId));
	const teachersRaw = teacherIds.length > 0
		? (await safeOptionalEntityList(() =>
				client.entities.teachers.list(entitiesByIds(teacherIds)),
			)) ?? []
		: [];

	return { teachersRaw, teacherAssignmentsRaw };
}

export async function fetchStaffInstructorSources(
	client: SchoolClient,
	classSubjectIds: readonly string[],
): Promise<Pick<ClassSubjectInstructorSources, 'staffMembersRaw' | 'staffAssignmentsRaw'>> {
	if (classSubjectIds.length === 0) {
		return { staffMembersRaw: [], staffAssignmentsRaw: [] };
	}

	const staffAssignmentsRaw = (await safeOptionalEntityList(() =>
		client.entities.staffAssignments.list(assignmentsForClassSubjects(classSubjectIds)),
	)) ?? [];
	const staffIds = uniqueIds(staffAssignmentsRaw.map(assignment => assignment.staffId));
	const staffMembersRaw = staffIds.length > 0
		? (await safeOptionalEntityList(() =>
				client.entities.staffMembers.list(entitiesByIds(staffIds)),
			)) ?? []
		: [];

	return { staffMembersRaw, staffAssignmentsRaw };
}

export async function fetchClassSubjectInstructorSourcesBundle(
	client: SchoolClient,
	classSubjectIds: readonly string[],
): Promise<ClassSubjectInstructorSources> {
	const [teacherSources, staffSources] = await Promise.all([
		fetchClassSubjectInstructorSources(client, classSubjectIds),
		fetchStaffInstructorSources(client, classSubjectIds),
	]);

	return {
		...teacherSources,
		...staffSources,
	};
}
