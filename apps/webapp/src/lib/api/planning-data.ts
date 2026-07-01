import type { HomeworkSources } from '$lib/api/homework-data';
import type { components } from '$lib/api/schema';
import type { getBrowserSchoolClient } from '$lib/api/school-client';
import type { PlanningEvent, PlanningEventKind, Resource } from '$lib/types/school';
import {
	assignmentsForClassSubjects,
	assignmentsForLessonSessions,
	classGroupScope,
	dedupeById,
	entitiesByIds,
	resourcesByIds,
	staffMembersByIds,
	uniqueIds,
} from '$lib/api/entity-list-filters';
import { fetchClassHomeworkSources } from '$lib/api/homework-data';

type SchoolClient = ReturnType<typeof getBrowserSchoolClient>;

type TimetableEventRaw = components['schemas']['TimetableEvent'];
type LessonSessionRaw = components['schemas']['LessonSession'];
type ClassSubjectRaw = components['schemas']['ClassSubject'];
type SubjectRaw = components['schemas']['Subject'];
type StaffMemberRaw = components['schemas']['StaffMember'];
type StaffAssignmentRaw = components['schemas']['StaffAssignment'];
type ResourceRaw = components['schemas']['Resource'];
type ResourceAssignmentRaw = components['schemas']['ResourceAssignment'];

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const;
const HOMEWORK_DUE_LANE_START = '17:00';
const HOMEWORK_DUE_LANE_END = '17:30';
const TIMETABLE_DAY_OFFSET: Record<PlanningEvent['day'], number> = {
	Mon: 0,
	Tue: 1,
	Wed: 2,
	Thu: 3,
	Fri: 4,
};

export interface PlanningSources {
	timetableEventsRaw: TimetableEventRaw[];
	lessonSessionsById: Map<string, LessonSessionRaw>;
	classSubjectsRaw: ClassSubjectRaw[];
	subjectsRaw: SubjectRaw[];
	staffMembersRaw: StaffMemberRaw[];
	staffAssignmentsRaw: StaffAssignmentRaw[];
	resourcesRaw: ResourceRaw[];
	resourceAssignmentsRaw: ResourceAssignmentRaw[];
}

export interface PlanningDateRange {
	startDate: string;
	endDate: string;
}

function toDateKey(date: Date): string {
	return date.toISOString().slice(0, 10);
}

export function defaultPlanningDateRange(reference = new Date()): PlanningDateRange {
	const start = new Date(reference);
	start.setUTCMonth(start.getUTCMonth() - 6);
	const end = new Date(reference);
	end.setUTCMonth(end.getUTCMonth() + 6);
	return { startDate: toDateKey(start), endDate: toDateKey(end) };
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

function lessonSessionIdForEvent(event: TimetableEventRaw): string | undefined {
	if (event.kind !== 'lesson') {
		return undefined;
	}
	return event.lessonSessionId ?? event.id;
}

export async function fetchClassPlanningSources(
	client: SchoolClient,
	classGroupId: string,
	range: PlanningDateRange = defaultPlanningDateRange(),
): Promise<PlanningSources> {
	const timetable = await client.queries.getClassGroupTimetable({
		classGroupId,
		startDate: range.startDate,
		endDate: range.endDate,
	});
	const timetableEventsRaw = timetable?.events ?? [];
	const lessonSessionIds = uniqueIds(
		timetableEventsRaw
			.map(lessonSessionIdForEvent)
			.filter((id): id is string => Boolean(id)),
	);

	const [
		lessonSessionsRaw,
		classSubjectsRaw,
		classGroupStaffAssignmentsRaw,
		classGroupResourceAssignmentsRaw,
	] = await Promise.all([
		lessonSessionIds.length > 0
			? client.entities.lessonSessions.list(entitiesByIds(lessonSessionIds))
			: Promise.resolve([]),
		client.entities.classSubjects.list(classGroupScope(classGroupId)),
		client.entities.staffAssignments.list(classGroupScope(classGroupId)),
		client.entities.resourceAssignments.list(classGroupScope(classGroupId)),
	]);

	const lessonSessionsById = new Map(
		(lessonSessionsRaw ?? []).map(session => [session.id, session]),
	);
	const classSubjectIds = uniqueIds((classSubjectsRaw ?? []).map(classSubject => classSubject.id));
	const subjectIds = uniqueIds((classSubjectsRaw ?? []).map(classSubject => classSubject.subjectId));

	const [
		sessionStaffAssignmentsRaw,
		classSubjectStaffAssignmentsRaw,
		sessionResourceAssignmentsRaw,
	] = await Promise.all([
		lessonSessionIds.length > 0
			? client.entities.staffAssignments.list(assignmentsForLessonSessions(lessonSessionIds))
			: Promise.resolve([]),
		classSubjectIds.length > 0
			? client.entities.staffAssignments.list(assignmentsForClassSubjects(classSubjectIds))
			: Promise.resolve([]),
		lessonSessionIds.length > 0
			? client.entities.resourceAssignments.list(assignmentsForLessonSessions(lessonSessionIds))
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
		timetableEventsRaw,
		lessonSessionsById,
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

	return sources.timetableEventsRaw
		.filter(event => event.classGroupId === classGroupId && event.kind === 'lesson')
		.map((event) => {
			const lessonSessionId = lessonSessionIdForEvent(event) ?? event.id;
			const lessonSession = sources.lessonSessionsById.get(lessonSessionId);
			const classSubjectId = event.classSubjectId ?? lessonSession?.classSubjectId;
			const classSubject = classSubjectId ? classSubjectById.get(classSubjectId) : undefined;
			const subject = classSubject ? subjectById.get(classSubject.subjectId) : undefined;
			const staffAssignment = sources.staffAssignmentsRaw.find(
				entry => entry.lessonSessionId === lessonSessionId,
			);
			const teacher = staffAssignment ? staffById.get(staffAssignment.staffId) : undefined;
			const resourceAssignment = sources.resourceAssignmentsRaw.find(
				entry => entry.lessonSessionId === lessonSessionId,
			);
			const resource = resourceAssignment ? resourceById.get(resourceAssignment.resourceId) : undefined;

			return {
				id: lessonSessionId,
				classId: event.classGroupId,
				scheduleId: lessonSession?.scheduleId ?? undefined,
				kind: 'lesson' satisfies PlanningEventKind,
				title: event.title,
				subject: subject?.name ?? event.title,
				day: dayLabel(event.startsAt),
				start: formatTime(event.startsAt),
				end: formatTime(event.endsAt),
				startsAt: String(event.startsAt),
				endsAt: String(event.endsAt),
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

export function mapHomeworkDuePlanningEvents(
	classGroupId: string,
	sources: HomeworkSources,
	range: PlanningDateRange,
): PlanningEvent[] {
	const subjectById = new Map(sources.subjectsRaw.map(subject => [subject.id, subject]));
	const classSubjectById = new Map(sources.classSubjectsRaw.map(entry => [entry.id, entry]));
	const rangeStart = new Date(`${range.startDate}T00:00:00.000Z`);
	const rangeEnd = new Date(`${range.endDate}T23:59:59.999Z`);

	return sources.homeworkAssessmentsRaw
		.filter(assessment => assessment.classGroupId === classGroupId && assessment.dueAt)
		.flatMap((assessment) => {
			const dueKey = formatDateKey(assessment.dueAt);
			const dueDate = new Date(`${dueKey}T12:00:00.000Z`);
			if (dueDate < rangeStart || dueDate > rangeEnd) {
				return [];
			}

			const classSubject = classSubjectById.get(assessment.classSubjectId);
			const subject = classSubject ? subjectById.get(classSubject.subjectId) : undefined;
			const { startsAt, endsAt } = homeworkDueInstants(dueKey);

			return [{
				id: `hw-due-${assessment.id}`,
				classId: classGroupId,
				kind: 'homework-due' as const,
				title: assessment.title,
				subject: subject?.name ?? assessment.title,
				day: dayLabel(startsAt),
				start: HOMEWORK_DUE_LANE_START,
				end: HOMEWORK_DUE_LANE_END,
				startsAt,
				endsAt,
				room: '—',
				teacher: '—',
			} satisfies PlanningEvent];
		});
}

function formatDateKey(value: unknown): string {
	if (!value) {
		return '';
	}
	if (value instanceof Date) {
		return value.toISOString().slice(0, 10);
	}
	if (typeof value === 'string') {
		return value.slice(0, 10);
	}
	return String(value).slice(0, 10);
}

function homeworkDueInstants(dueDateKey: string): { startsAt: string; endsAt: string } {
	const weekStart = mondayOfWeekUtc(new Date(`${dueDateKey}T12:00:00.000Z`));
	const dayOffset = TIMETABLE_DAY_OFFSET[dayLabel(`${dueDateKey}T12:00:00.000Z`)];
	const startsAt = new Date(weekStart);
	startsAt.setUTCDate(startsAt.getUTCDate() + dayOffset);
	const [startHour, startMinute] = HOMEWORK_DUE_LANE_START.split(':').map(Number);
	const [endHour, endMinute] = HOMEWORK_DUE_LANE_END.split(':').map(Number);
	startsAt.setUTCHours(startHour ?? 17, startMinute ?? 0, 0, 0);
	const endsAt = new Date(startsAt);
	endsAt.setUTCHours(endHour ?? 17, endMinute ?? 30, 0, 0);
	return {
		startsAt: startsAt.toISOString(),
		endsAt: endsAt.toISOString(),
	};
}

function mondayOfWeekUtc(date: Date): Date {
	const d = new Date(date);
	d.setUTCHours(0, 0, 0, 0);
	const diff = (d.getUTCDay() + 6) % 7;
	d.setUTCDate(d.getUTCDate() - diff);
	return d;
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

export async function loadClassPlanning(
	client: SchoolClient,
	classGroupId: string,
	options?: { range?: PlanningDateRange; periodId?: string },
): Promise<PlanningEvent[]> {
	const range = options?.range ?? defaultPlanningDateRange();
	const [sources, homeworkSources] = await Promise.all([
		fetchClassPlanningSources(client, classGroupId, range),
		fetchClassHomeworkSources(client, classGroupId, options?.periodId),
	]);
	const lessonEvents = mapPlanningEvents(classGroupId, sources);
	const homeworkEvents = mapHomeworkDuePlanningEvents(classGroupId, homeworkSources, range);
	return [...lessonEvents, ...homeworkEvents].sort(comparePlanningEvents);
}

function comparePlanningEvents(left: PlanningEvent, right: PlanningEvent): number {
	const dayOrder = DAY_LABELS.indexOf(left.day) - DAY_LABELS.indexOf(right.day);
	if (dayOrder !== 0) {
		return dayOrder;
	}
	return left.start.localeCompare(right.start);
}
