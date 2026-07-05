import type { components } from '$lib/api/schema';
import type { getBrowserSchoolClient } from '$lib/api/school-client';
import type { StaffMember, StaffRole, SubjectCategory } from '$lib/types/school';
import { ApiError } from '$api-client';
import {
	DEFAULT_LIST_PAGE_SIZE,
	entitiesByIds,
	paginatedList,
	STAFF_LIST_ORDER,
	staffAssignmentsForStaff,
	uniqueIds,
} from '$lib/api/entity-list-filters';
import { safeOptionalEntityList } from '$lib/api/safe-entity-access';

type SchoolClient = ReturnType<typeof getBrowserSchoolClient>;

type StaffRaw = components['schemas']['StaffMember'];
type ClassGroupRaw = components['schemas']['ClassGroup'];
type AssignmentRaw = components['schemas']['StaffAssignment'];
type ClassSubjectRaw = components['schemas']['ClassSubject'];
type SubjectRaw = components['schemas']['Subject'];

function inferStaffRole(
	member: StaffRaw,
	assignments: AssignmentRaw[],
	classGroups: ClassGroupRaw[],
): StaffRole {
	if (classGroups.some(group => group.homeroomStaffId === member.id)) {
		return 'prof_principal';
	}

	const responsibilities = assignments
		.filter(assignment => assignment.staffId === member.id)
		.map(assignment => assignment.responsibility.toLowerCase());

	if (responsibilities.some(value => value.includes('direct') || value.includes('principal'))) {
		return 'directeur';
	}
	if (responsibilities.some(value => value.includes('educat'))) {
		return 'educateur';
	}

	return 'professeur';
}

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
	assignments: AssignmentRaw[],
	classGroups: ClassGroupRaw[],
	ownerSubjectId?: string | null,
): StaffRole {
	if (ownerSubjectId && member.subjectId === ownerSubjectId) {
		return 'owner';
	}
	return inferStaffRole(member, assignments, classGroups);
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
	if (role === 'directeur' || role === 'owner') {
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
	classGroupsRaw: ClassGroupRaw[],
	assignmentsRaw: AssignmentRaw[],
	classSubjectsRaw: ClassSubjectRaw[] = [],
	subjectsRaw: SubjectRaw[] = [],
	ownerSubjectId?: string | null,
): StaffMember[] {
	return (staffRaw ?? []).map((member) => {
		const role = mapStaffRole(member, assignmentsRaw ?? [], classGroupsRaw ?? [], ownerSubjectId);

		const classesTaught = [...new Set(
			(assignmentsRaw ?? [])
				.filter(entry => entry.staffId === member.id && entry.classGroupId)
				.map(entry => entry.classGroupId as string),
		)];

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
	const assignmentsRaw = await safeOptionalEntityList(() =>
		client.entities.staffAssignments.list(staffAssignmentsForStaff(staffIds)));
	const classSubjectIds = uniqueIds(
		assignmentsRaw
			.map(assignment => assignment.classSubjectId)
			.filter((id): id is string => Boolean(id)),
	);
	const classSubjectsRaw = classSubjectIds.length > 0
		? await safeOptionalEntityList(() => client.entities.classSubjects.list(entitiesByIds(classSubjectIds)))
		: [];
	const subjectIds = uniqueIds(classSubjectsRaw.map(classSubject => classSubject.subjectId));
	const subjectsRaw = subjectIds.length > 0
		? await safeOptionalEntityList(() => client.entities.subjects.list(entitiesByIds(subjectIds)))
		: [];

	return {
		assignmentsRaw,
		classSubjectsRaw,
		subjectsRaw,
	};
}

async function resolveSchoolOwnerSubjectId(
	client: SchoolClient,
	schoolId: string,
): Promise<string | null | undefined> {
	try {
		const school = await client.entities.schools.get(schoolId);
		return school.ownerSubjectId;
	}
	catch (error) {
		if (error instanceof ApiError && (error.status === 403 || error.status === 401)) {
			return undefined;
		}
		throw error;
	}
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
	const [relations, ownerSubjectId] = await Promise.all([
		fetchStaffRelations(client, staffIds),
		resolveSchoolOwnerSubjectId(client, scope.schoolId),
	]);

	return mapStaffMembers(
		staffRaw ?? [],
		classGroupsRaw ?? [],
		relations.assignmentsRaw,
		relations.classSubjectsRaw,
		relations.subjectsRaw,
		ownerSubjectId,
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
	const ownerSubjectId = await resolveSchoolOwnerSubjectId(client, schoolId);
	const members = mapStaffMembers(
		[staff],
		classGroupsRaw ?? [],
		relations.assignmentsRaw,
		relations.classSubjectsRaw,
		relations.subjectsRaw,
		ownerSubjectId,
	);
	return members.find(member => member.id === staffId) ?? null;
}

/** Loads the signed-in staff profile without admin-only relation endpoints. */
export async function fetchSessionStaffProfile(
	client: SchoolClient,
	staffId: string,
	options?: { isElevated?: boolean },
): Promise<{
	profile: StaffMember;
	notificationEmail: string | null;
	notificationPhone: string | null;
}> {
	const staff = await client.entities.staffMembers.get(staffId);
	const ownerSubjectId = options?.isElevated
		? staff.subjectId
		: await resolveSchoolOwnerSubjectId(client, staff.schoolId);
	let role: StaffRole = ownerSubjectId && staff.subjectId === ownerSubjectId
		? 'owner'
		: 'professeur';
	try {
		const relations = await fetchStaffRelations(client, [staffId]);
		const classGroupsRaw = await client.entities.classGroups.list({ schoolId: staff.schoolId });
		role = mapStaffRole(staff, relations.assignmentsRaw, classGroupsRaw ?? [], ownerSubjectId);
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
	assignments: AssignmentRaw[];
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
		return { staff: [], totalStaff, assignments: [] };
	}
	const [relations, ownerSubjectId] = await Promise.all([
		fetchStaffRelations(client, staffIds),
		resolveSchoolOwnerSubjectId(client, scope.schoolId),
	]);

	return {
		staff: mapStaffMembers(
			staffRaw ?? [],
			classGroupsRaw ?? [],
			relations.assignmentsRaw,
			relations.classSubjectsRaw,
			relations.subjectsRaw,
			ownerSubjectId,
		),
		totalStaff,
		assignments: relations.assignmentsRaw,
	};
}
