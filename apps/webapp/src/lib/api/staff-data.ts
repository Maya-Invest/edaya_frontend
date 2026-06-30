import type { components } from '$lib/api/schema';
import type { getBrowserSchoolClient } from '$lib/api/school-client';
import type { StaffMember, StaffRole, SubjectCategory } from '$lib/types/school';
import {
	DEFAULT_LIST_PAGE_SIZE,
	entitiesByIds,
	paginatedList,
	STAFF_LIST_ORDER,
	staffAssignmentsForStaff,
	staffRoleAssignmentsForStaff,
	uniqueIds,
} from '$lib/api/entity-list-filters';
import { ApiError } from '@edaya/api-client';

type SchoolClient = ReturnType<typeof getBrowserSchoolClient>;

type StaffRaw = components['schemas']['StaffMember'];
type RoleAssignmentRaw = components['schemas']['StaffRoleAssignment'];
type ClassGroupRaw = components['schemas']['ClassGroup'];
type AssignmentRaw = components['schemas']['StaffAssignment'];
type ClassSubjectRaw = components['schemas']['ClassSubject'];
type SubjectRaw = components['schemas']['Subject'];

const ROLE_ID_TO_STAFF_ROLE: Record<string, StaffRole> = {
	'role-director': 'directeur',
	'role-coordinator': 'prof_principal',
	'role-educator': 'educateur',
	'role-teacher': 'professeur',
	'directeur': 'directeur',
	'director': 'directeur',
	'prof_principal': 'prof_principal',
	'principal_teacher': 'prof_principal',
	'educateur': 'educateur',
	'educator': 'educateur',
};

function inferSubjectCategory(name: string, code?: string | null): SubjectCategory {
	const label = `${name} ${code ?? ''}`.toLowerCase();

	if (/english|anglais|espagnol|allemand|langue/.test(label)) {
		return 'Langues';
	}
	if (/sport|eps|physique/.test(label) && !/chimie|physics/.test(label)) {
		return 'Sport';
	}
	if (/art|musique|dessin/.test(label)) {
		return 'Arts';
	}
	if (/histoire|géographie|geography|humanities/.test(label)) {
		return 'Sciences humaines';
	}
	if (/français|literature|littér|lettre|french/.test(label)) {
		return 'Littéraire';
	}

	return 'Scientifique';
}

function categoryToDepartment(category: SubjectCategory): string {
	switch (category) {
		case 'Littéraire':
		case 'Sciences humaines':
			return 'Lettres';
		case 'Langues':
			return 'Langues';
		case 'Sport':
			return 'Sport';
		case 'Arts':
			return 'Arts';
		default:
			return 'Sciences';
	}
}

export function mapStaffRole(
	member: StaffRaw,
	roleAssignments: RoleAssignmentRaw[],
): StaffRole {
	const assignment = roleAssignments.find(
		entry => entry.staffId === member.id && entry.status !== 'inactive',
	);
	const roleId = assignment?.roleIds[0];
	if (roleId && ROLE_ID_TO_STAFF_ROLE[roleId]) {
		return ROLE_ID_TO_STAFF_ROLE[roleId];
	}
	return 'professeur';
}

function catalogSubjectIdsForStaff(
	staffId: string,
	assignments: AssignmentRaw[],
	classSubjects: ClassSubjectRaw[],
): string[] {
	const subjectIds = new Set<string>();
	for (const assignment of assignments) {
		if (assignment.staffId !== staffId || !assignment.classSubjectId) {
			continue;
		}
		const offering = classSubjects.find(entry => entry.id === assignment.classSubjectId);
		if (offering?.subjectId) {
			subjectIds.add(offering.subjectId);
		}
	}
	return [...subjectIds];
}

function subjectLabelsForCatalogIds(catalogIds: string[], subjects: SubjectRaw[]): string[] {
	return catalogIds.map(
		id => subjects.find(subject => subject.id === id)?.name ?? id,
	);
}

export function mapDepartment(
	role: StaffRole,
	staffId: string,
	assignments: AssignmentRaw[],
	catalogSubjectIds: string[],
	subjects: SubjectRaw[],
): string {
	if (role === 'directeur') {
		return 'Direction';
	}
	if (role === 'educateur') {
		return 'Vie scolaire';
	}

	const specialized = assignments.find(
		entry => entry.staffId === staffId && entry.responsibility && entry.responsibility !== 'Teacher',
	);
	if (specialized?.responsibility === 'Mathematics') {
		return 'Sciences';
	}

	if (catalogSubjectIds.length > 0) {
		const departments = [...new Set(catalogSubjectIds.map((subjectId) => {
			const subject = subjects.find(entry => entry.id === subjectId);
			return categoryToDepartment(
				inferSubjectCategory(subject?.name ?? subjectId, subject?.code),
			);
		}))];
		return departments.length === 1 ? departments[0]! : departments[0] ?? 'Sciences';
	}

	return 'Sciences';
}

export function mapStaffMembers(
	staffRaw: StaffRaw[],
	roleAssignmentsRaw: RoleAssignmentRaw[],
	classGroupsRaw: ClassGroupRaw[],
	assignmentsRaw: AssignmentRaw[],
	classSubjectsRaw: ClassSubjectRaw[] = [],
	subjectsRaw: SubjectRaw[] = [],
): StaffMember[] {
	return (staffRaw ?? []).map((member) => {
		const role = mapStaffRole(member, roleAssignmentsRaw);

		const classesTaught = (assignmentsRaw ?? [])
			.filter(entry => entry.staffId === member.id && entry.classGroupId)
			.map(entry => entry.classGroupId as string);

		const homeroomClass = (classGroupsRaw ?? []).find(entry => entry.homeroomStaffId === member.id);
		const mainClassId = homeroomClass?.id;
		if (mainClassId && !classesTaught.includes(mainClassId)) {
			classesTaught.push(mainClassId);
		}

		const catalogSubjectIds = catalogSubjectIdsForStaff(
			member.id,
			assignmentsRaw ?? [],
			classSubjectsRaw,
		);

		return {
			id: member.id,
			name: `${member.firstName} ${member.lastName}`,
			initials: `${member.firstName[0] ?? ''}${member.lastName[0] ?? ''}`,
			photoUrl: member.photoUrl ?? null,
			role,
			department: mapDepartment(
				role,
				member.id,
				assignmentsRaw ?? [],
				catalogSubjectIds,
				subjectsRaw,
			),
			email: member.email ?? '',
			classes: classesTaught,
			mainClassId,
			subjectsTaught: catalogSubjectIds,
			subjectLabels: subjectLabelsForCatalogIds(catalogSubjectIds, subjectsRaw),
			isActive: member.isActive ?? true,
			subjectId: member.subjectId ?? null,
		};
	});
}

async function fetchStaffRelations(client: SchoolClient, staffIds: readonly string[]) {
	const [roleAssignmentsRaw, assignmentsRaw] = await Promise.all([
		client.entities.staffRoleAssignments.list(staffRoleAssignmentsForStaff(staffIds)),
		client.entities.staffAssignments.list(staffAssignmentsForStaff(staffIds)),
	]);
	const classSubjectIds = uniqueIds(
		(assignmentsRaw ?? [])
			.map(assignment => assignment.classSubjectId)
			.filter((id): id is string => Boolean(id)),
	);
	const classSubjectsRaw = classSubjectIds.length > 0
		? await client.entities.classSubjects.list(entitiesByIds(classSubjectIds))
		: [];
	const subjectIds = uniqueIds((classSubjectsRaw ?? []).map(classSubject => classSubject.subjectId));
	const subjectsRaw = subjectIds.length > 0
		? await client.entities.subjects.list(entitiesByIds(subjectIds))
		: [];

	return {
		roleAssignmentsRaw: roleAssignmentsRaw ?? [],
		assignmentsRaw: assignmentsRaw ?? [],
		classSubjectsRaw: classSubjectsRaw ?? [],
		subjectsRaw: subjectsRaw ?? [],
	};
}

export async function fetchStaffMembers(
	client: SchoolClient,
	scope: { schoolId: string; academicYearId: string },
): Promise<StaffMember[]> {
	const [staffRaw, classGroupsRaw] = await Promise.all([
		client.entities.staffMembers.list({ schoolId: scope.schoolId }),
		client.entities.classGroups.list({
			schoolId: scope.schoolId,
			academicYearId: scope.academicYearId,
		}),
	]);
	const staffIds = uniqueIds((staffRaw ?? []).map(member => member.id));
	if (staffIds.length === 0) {
		return [];
	}
	const relations = await fetchStaffRelations(client, staffIds);

	return mapStaffMembers(
		staffRaw ?? [],
		relations.roleAssignmentsRaw,
		classGroupsRaw ?? [],
		relations.assignmentsRaw,
		relations.classSubjectsRaw,
		relations.subjectsRaw,
	);
}

export async function fetchStaffMemberById(
	client: SchoolClient,
	staffId: string,
	schoolId: string,
): Promise<StaffMember | null> {
	const staff = await client.entities.staffMembers.get(staffId);
	const relations = await fetchStaffRelations(client, [staffId]);
	const assignedClassIds = uniqueIds(
		relations.assignmentsRaw
			.map(assignment => assignment.classGroupId)
			.filter((id): id is string => Boolean(id)),
	);
	const classGroupsRaw = await client.entities.classGroups.list({
		schoolId,
		$or: [
			{ homeroomStaffId: staffId },
			...(assignedClassIds.length > 0 ? [entitiesByIds(assignedClassIds)] : []),
		],
	});
	const members = mapStaffMembers(
		[staff],
		relations.roleAssignmentsRaw,
		classGroupsRaw ?? [],
		relations.assignmentsRaw,
		relations.classSubjectsRaw,
		relations.subjectsRaw,
	);
	return members.find(member => member.id === staffId) ?? null;
}

/** Loads the signed-in staff profile without admin-only relation endpoints. */
export async function fetchSessionStaffProfile(
	client: SchoolClient,
	staffId: string,
): Promise<{
	profile: StaffMember;
	notificationEmail: string | null;
	notificationPhone: string | null;
}> {
	const staff = await client.entities.staffMembers.get(staffId);
	let role: StaffRole = 'professeur';
	try {
		const relations = await fetchStaffRelations(client, [staffId]);
		role = mapStaffRole(staff, relations.roleAssignmentsRaw);
	}
	catch (error) {
		if (!(error instanceof ApiError && (error.status === 403 || error.status === 401))) {
			throw error;
		}
	}

	return {
		profile: {
			id: staff.id,
			name: `${staff.firstName} ${staff.lastName}`,
			initials: `${staff.firstName[0] ?? ''}${staff.lastName[0] ?? ''}`,
			photoUrl: staff.photoUrl ?? null,
			role,
			department: mapDepartment(role, staff.id, [], [], []),
			email: staff.email ?? '',
			classes: [],
			mainClassId: undefined,
			subjectsTaught: [],
			subjectLabels: [],
			isActive: staff.isActive ?? true,
			subjectId: staff.subjectId ?? null,
		},
		notificationEmail: staff.notificationEmail ?? null,
		notificationPhone: staff.notificationPhone ?? null,
	};
}

export interface StaffPageRequest {
	offset?: number;
	limit?: number;
}

export interface PaginatedStaffData {
	staff: StaffMember[];
	totalStaff: number;
}

export async function fetchStaffMembersPage(
	client: SchoolClient,
	scope: { schoolId: string; academicYearId: string },
	request: StaffPageRequest = {},
): Promise<PaginatedStaffData> {
	const limit = request.limit ?? DEFAULT_LIST_PAGE_SIZE;
	const offset = request.offset ?? 0;
	const staffFilter = paginatedList({ schoolId: scope.schoolId }, {
		limit,
		offset,
		orderBy: STAFF_LIST_ORDER,
	});

	const [staffRaw, totalStaff, classGroupsRaw] = await Promise.all([
		client.entities.staffMembers.list(staffFilter),
		client.entities.staffMembers.count({ schoolId: scope.schoolId }).then(result => result.count),
		client.entities.classGroups.list({
			schoolId: scope.schoolId,
			academicYearId: scope.academicYearId,
		}),
	]);
	const staffIds = uniqueIds((staffRaw ?? []).map(member => member.id));
	if (staffIds.length === 0) {
		return { staff: [], totalStaff };
	}
	const relations = await fetchStaffRelations(client, staffIds);

	return {
		staff: mapStaffMembers(
			staffRaw ?? [],
			relations.roleAssignmentsRaw,
			classGroupsRaw ?? [],
			relations.assignmentsRaw,
			relations.classSubjectsRaw,
			relations.subjectsRaw,
		),
		totalStaff,
	};
}
