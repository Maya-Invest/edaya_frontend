import type { components } from '$lib/api/schema';
import type { getBrowserSchoolClient } from '$lib/api/school-client';
import type { PlanningEvent, Resource } from '$lib/types/school';
import {
	assignmentsForClassSubjects,
	assignmentsForSessions,
	classGroupScope,
	dedupeById,
	entitiesByIds,
	resourcesByIds,
	staffMembersByIds,
	uniqueIds,
} from '$lib/api/entity-list-filters';

type SchoolClient = ReturnType<typeof getBrowserSchoolClient>;

type SessionRaw = components['schemas']['Session'];
type ClassSubjectRaw = components['schemas']['ClassSubject'];
type SubjectRaw = components['schemas']['Subject'];
type StaffMemberRaw = components['schemas']['StaffMember'];
type StaffAssignmentRaw = components['schemas']['StaffAssignment'];
type ResourceRaw = components['schemas']['Resource'];
type ResourceAssignmentRaw = components['schemas']['ResourceAssignment'];

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const;

export interface PlanningSources {
	sessionsRaw: SessionRaw[];
	classSubjectsRaw: ClassSubjectRaw[];
	subjectsRaw: SubjectRaw[];
	staffMembersRaw: StaffMemberRaw[];
	staffAssignmentsRaw: StaffAssignmentRaw[];
	resourcesRaw: ResourceRaw[];
	resourceAssignmentsRaw: ResourceAssignmentRaw[];
}

function formatTime(value: unknown): string {
	const date = value instanceof Date ? value : new Date(String(value));
	const hours = `${date.getUTCHours()}`.padStart(2, '0');
	const minutes = `${date.getUTCMinutes()}`.padStart(2, '0');
	return `${hours}:${minutes}`;
}

function dayLabel(value: unknown): PlanningEvent['day'] {
	const date = value instanceof Date ? value : new Date(String(value));
	const label = DAY_LABELS[date.getUTCDay()] ?? 'Mon';
	if (label === 'Sun' || label === 'Sat') {
		return 'Mon';
	}
	return label;
}

export async function fetchClassPlanningSources(
	client: SchoolClient,
	classGroupId: string,
): Promise<PlanningSources> {
	const [
		sessionsRaw,
		classSubjectsRaw,
		classGroupStaffAssignmentsRaw,
		classGroupResourceAssignmentsRaw,
	] = await Promise.all([
		client.entities.sessions.list(classGroupScope(classGroupId)),
		client.entities.classSubjects.list(classGroupScope(classGroupId)),
		client.entities.staffAssignments.list(classGroupScope(classGroupId)),
		client.entities.resourceAssignments.list(classGroupScope(classGroupId)),
	]);

	const sessionIds = uniqueIds((sessionsRaw ?? []).map(session => session.id));
	const classSubjectIds = uniqueIds((classSubjectsRaw ?? []).map(classSubject => classSubject.id));
	const subjectIds = uniqueIds((classSubjectsRaw ?? []).map(classSubject => classSubject.subjectId));

	const [
		sessionStaffAssignmentsRaw,
		classSubjectStaffAssignmentsRaw,
		sessionResourceAssignmentsRaw,
	] = await Promise.all([
		sessionIds.length > 0
			? client.entities.staffAssignments.list(assignmentsForSessions(sessionIds))
			: Promise.resolve([]),
		classSubjectIds.length > 0
			? client.entities.staffAssignments.list(assignmentsForClassSubjects(classSubjectIds))
			: Promise.resolve([]),
		sessionIds.length > 0
			? client.entities.resourceAssignments.list(assignmentsForSessions(sessionIds))
			: Promise.resolve([]),
	]);

	const staffAssignmentsRaw = dedupeById([
		...(classGroupStaffAssignmentsRaw ?? []),
		...(sessionStaffAssignmentsRaw ?? []),
		...(classSubjectStaffAssignmentsRaw ?? []),
	]);
	const resourceAssignmentsRaw = dedupeById([
		...(classGroupResourceAssignmentsRaw ?? []),
		...(sessionResourceAssignmentsRaw ?? []),
	]);

	const staffIds = uniqueIds(staffAssignmentsRaw.map(assignment => assignment.staffId));
	const resourceIds = uniqueIds(resourceAssignmentsRaw.map(assignment => assignment.resourceId));

	const [
		subjectsRaw,
		staffMembersRaw,
		resourcesRaw,
	] = await Promise.all([
		subjectIds.length > 0
			? client.entities.subjects.list(entitiesByIds(subjectIds))
			: Promise.resolve([]),
		staffIds.length > 0
			? client.entities.staffMembers.list(staffMembersByIds(staffIds))
			: Promise.resolve([]),
		resourceIds.length > 0
			? client.entities.resources.list(resourcesByIds(resourceIds))
			: Promise.resolve([]),
	]);

	return {
		sessionsRaw: sessionsRaw ?? [],
		classSubjectsRaw: classSubjectsRaw ?? [],
		subjectsRaw: subjectsRaw ?? [],
		staffMembersRaw: staffMembersRaw ?? [],
		staffAssignmentsRaw,
		resourcesRaw: resourcesRaw ?? [],
		resourceAssignmentsRaw,
	};
}

export function mapPlanningEvents(
	classGroupId: string,
	sources: PlanningSources,
): PlanningEvent[] {
	const subjectById = new Map(sources.subjectsRaw.map(subject => [subject.id, subject]));
	const classSubjectById = new Map(sources.classSubjectsRaw.map(entry => [entry.id, entry]));
	const staffById = new Map(sources.staffMembersRaw.map(member => [member.id, member]));
	const resourceById = new Map(sources.resourcesRaw.map(resource => [resource.id, resource]));

	return sources.sessionsRaw
		.filter(session => session.classGroupId === classGroupId)
		.map((session) => {
			const classSubject = session.classSubjectId
				? classSubjectById.get(session.classSubjectId)
				: undefined;
			const subject = classSubject ? subjectById.get(classSubject.subjectId) : undefined;
			const staffAssignment = sources.staffAssignmentsRaw.find(entry => entry.sessionId === session.id);
			const teacher = staffAssignment ? staffById.get(staffAssignment.staffId) : undefined;
			const resourceAssignment = sources.resourceAssignmentsRaw.find(entry => entry.sessionId === session.id);
			const resource = resourceAssignment ? resourceById.get(resourceAssignment.resourceId) : undefined;

			return {
				id: session.id,
				classId: session.classGroupId,
				scheduleId: session.scheduleId ?? undefined,
				title: session.title,
				subject: subject?.name ?? session.title,
				day: dayLabel(session.startsAt),
				start: formatTime(session.startsAt),
				end: formatTime(session.endsAt),
				startsAt: String(session.startsAt),
				endsAt: String(session.endsAt),
				room: resource?.name ?? '—',
				teacher: teacher ? `${teacher.firstName} ${teacher.lastName}` : 'Non assigné',
			} satisfies PlanningEvent;
		})
		.sort((left, right) => {
			const dayOrder = DAY_LABELS.indexOf(left.day) - DAY_LABELS.indexOf(right.day);
			if (dayOrder !== 0) {
				return dayOrder;
			}
			return left.start.localeCompare(right.start);
		});
}

export function mapAllPlanningEvents(sources: PlanningSources, classGroupIds: string[]): PlanningEvent[] {
	return classGroupIds.flatMap(classId => mapPlanningEvents(classId, sources));
}

const RESOURCE_KIND_MAP: Record<ResourceRaw['kind'], Resource['type']> = {
	location: 'Room',
	equipment: 'Equipment',
	vehicle: 'Vehicle',
	other: 'Equipment',
};

export function mapResources(resourcesRaw: ResourceRaw[]): Resource[] {
	return resourcesRaw.map(resource => ({
		id: resource.id,
		name: resource.name,
		type: RESOURCE_KIND_MAP[resource.kind] ?? 'Equipment',
		capacity: resource.capacity ?? undefined,
		location: resource.description?.trim() || '—',
		status: 'available',
	}));
}

export async function loadClassPlanning(client: SchoolClient, classGroupId: string): Promise<PlanningEvent[]> {
	const sources = await fetchClassPlanningSources(client, classGroupId);
	return mapPlanningEvents(classGroupId, sources);
}
