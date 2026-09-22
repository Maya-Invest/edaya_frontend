import type { HomeworkSources } from '$lib/api/homework-data';
import type { components } from '$lib/api/schema';
import type { getBrowserSchoolClient } from '$lib/api/school-client';
import type { ClassSubjectInstructorSources } from '$lib/api/teacher-display';
import type { PlanningEvent, Resource } from '$lib/types/school';
import {
	classGroupScope,
	dedupeById,
	listAllEntityPages,
	listAllEntityPagesByIds,
	listAllEntityPagesForIdFilters,
	uniqueIds,
} from '$lib/api/entity-list-filters';
import { fetchClassHomeworkSources } from '$lib/api/homework-data';
import {
	fetchClassSubjectInstructorSources,

	instructorName,
	instructorNameFromStaffAssignment,
} from '$lib/api/teacher-display';
import { formatDateInput } from '$lib/date/format';

type SchoolClient = ReturnType<typeof getBrowserSchoolClient>;

type TimetableEventRaw = components['schemas']['TimetableEvent'];
type LessonSessionRaw = components['schemas']['LessonSession'];
type ActivitySessionRaw = components['schemas']['ActivitySession'];
type ActivityRaw = components['schemas']['Activity'];
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

const TIMETABLE_EVENT_KINDS = new Set<TimetableEventRaw['kind']>(['lesson', 'activity', 'assessment']);

export interface PlanningSources extends ClassSubjectInstructorSources {
	timetableEventsRaw: TimetableEventRaw[];
	lessonSessionsById: Map<string, LessonSessionRaw>;
	activitySessionsById: Map<string, ActivitySessionRaw>;
	activitiesById: Map<string, ActivityRaw>;
	classSubjectsRaw: ClassSubjectRaw[];
	subjectsRaw: SubjectRaw[];
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

export function academicYearPlanningRange(year?: {
	startDate?: string | null;
	endDate?: string | null;
} | null): PlanningDateRange {
	const startDate = formatDateInput(year?.startDate);
	const endDate = formatDateInput(year?.endDate);
	if (startDate && endDate) {
		return { startDate, endDate };
	}
	return defaultPlanningDateRange();
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

function activitySessionIdForEvent(event: TimetableEventRaw): string | undefined {
	if (event.kind !== 'activity') {
		return undefined;
	}
	return event.activitySessionId ?? event.id;
}

function assessmentIdForEvent(event: TimetableEventRaw): string | undefined {
	if (event.kind !== 'assessment') {
		return undefined;
	}
	return event.assessmentId ?? event.id;
}

function planningEventId(event: TimetableEventRaw): string {
	return lessonSessionIdForEvent(event)
		?? activitySessionIdForEvent(event)
		?? assessmentIdForEvent(event)
		?? event.id;
}

function staffName(
	staffAssignments: StaffAssignmentRaw[],
	staffById: Map<string, StaffMemberRaw>,
	match: (assignment: StaffAssignmentRaw) => boolean,
): string {
	return instructorNameFromStaffAssignment(staffAssignments, staffById, match);
}

function planningInstructorName(
	sources: PlanningSources,
	options: {
		classSubjectId?: string;
		staffMatch: (assignment: StaffAssignmentRaw) => boolean;
	},
): string {
	return instructorName(sources, {
		classSubjectId: options.classSubjectId,
		staffMatch: options.staffMatch,
	});
}

function roomName(
	resourceAssignments: ResourceAssignmentRaw[],
	resourceById: Map<string, ResourceRaw>,
	match: (assignment: ResourceAssignmentRaw) => boolean,
): string {
	const assignment = resourceAssignments.find(match);
	const resource = assignment ? resourceById.get(assignment.resourceId) : undefined;
	return resource?.name ?? '—';
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
	const activitySessionIds = uniqueIds(
		timetableEventsRaw
			.map(activitySessionIdForEvent)
			.filter((id): id is string => Boolean(id)),
	);
	const assessmentIds = uniqueIds(
		timetableEventsRaw
			.map(assessmentIdForEvent)
			.filter((id): id is string => Boolean(id)),
	);

	const [
		lessonSessionsRaw,
		activitySessionsRaw,
		classSubjectsRaw,
		classGroupStaffAssignmentsRaw,
		classGroupResourceAssignmentsRaw,
	] = await Promise.all([
		listAllEntityPagesByIds(query => client.entities.lessonSessions.list(query), lessonSessionIds),
		listAllEntityPagesByIds(query => client.entities.activitySessions.list(query), activitySessionIds),
		listAllEntityPages(query => client.entities.classSubjects.list(query), {
			baseQuery: classGroupScope(classGroupId),
		}),
		listAllEntityPages(query => client.entities.staffAssignments.list(query), {
			baseQuery: classGroupScope(classGroupId),
		}),
		listAllEntityPages(query => client.entities.resourceAssignments.list(query), {
			baseQuery: classGroupScope(classGroupId),
		}),
	]);

	const lessonSessionsById = new Map(
		lessonSessionsRaw.map(session => [session.id, session]),
	);
	const activitySessionsById = new Map(
		activitySessionsRaw.map(session => [session.id, session]),
	);
	const activityIds = uniqueIds([
		...timetableEventsRaw
			.map(event => event.activityId)
			.filter((id): id is string => Boolean(id)),
		...activitySessionsRaw.map(session => session.activityId),
	]);
	const classSubjectIds = uniqueIds(classSubjectsRaw.map(classSubject => classSubject.id));
	const subjectIds = uniqueIds(classSubjectsRaw.map(classSubject => classSubject.subjectId));

	const [
		activitiesRaw,
		sessionStaffAssignmentsRaw,
		classSubjectStaffAssignmentsRaw,
		activityStaffAssignmentsRaw,
		assessmentStaffAssignmentsRaw,
		sessionResourceAssignmentsRaw,
		activityResourceAssignmentsRaw,
		assessmentResourceAssignmentsRaw,
	] = await Promise.all([
		listAllEntityPagesByIds(query => client.entities.activities.list(query), activityIds),
		listAllEntityPagesForIdFilters(
			query => client.entities.staffAssignments.list(query),
			[{ field: 'lessonSessionId', ids: lessonSessionIds }],
		),
		listAllEntityPagesForIdFilters(
			query => client.entities.staffAssignments.list(query),
			[{ field: 'classSubjectId', ids: classSubjectIds }],
		),
		listAllEntityPagesForIdFilters(
			query => client.entities.staffAssignments.list(query),
			[{ field: 'activitySessionId', ids: activitySessionIds }],
		),
		listAllEntityPagesForIdFilters(
			query => client.entities.staffAssignments.list(query),
			[{ field: 'assessmentId', ids: assessmentIds }],
		),
		listAllEntityPagesForIdFilters(
			query => client.entities.resourceAssignments.list(query),
			[{ field: 'lessonSessionId', ids: lessonSessionIds }],
		),
		listAllEntityPagesForIdFilters(
			query => client.entities.resourceAssignments.list(query),
			[{ field: 'activitySessionId', ids: activitySessionIds }],
		),
		listAllEntityPagesForIdFilters(
			query => client.entities.resourceAssignments.list(query),
			[{ field: 'assessmentId', ids: assessmentIds }],
		),
	]);

	const staffAssignmentsRaw = dedupeById([
		...classGroupStaffAssignmentsRaw,
		...sessionStaffAssignmentsRaw,
		...classSubjectStaffAssignmentsRaw,
		...activityStaffAssignmentsRaw,
		...assessmentStaffAssignmentsRaw,
	]);
	const resourceAssignmentsRaw = dedupeById([
		...classGroupResourceAssignmentsRaw,
		...sessionResourceAssignmentsRaw,
		...activityResourceAssignmentsRaw,
		...assessmentResourceAssignmentsRaw,
	]);

	const staffIds = uniqueIds(staffAssignmentsRaw.map(assignment => assignment.staffId));
	const resourceIds = uniqueIds(resourceAssignmentsRaw.map(assignment => assignment.resourceId));

	const [
		subjectsRaw,
		staffMembersRaw,
		resourcesRaw,
	] = await Promise.all([
		listAllEntityPagesByIds(query => client.entities.subjects.list(query), subjectIds),
		listAllEntityPagesByIds(query => client.entities.staffMembers.list(query), staffIds),
		listAllEntityPagesByIds(query => client.entities.resources.list(query), resourceIds),
	]);
	const teacherInstructorSources = await fetchClassSubjectInstructorSources(client, classSubjectIds);

	return {
		timetableEventsRaw,
		lessonSessionsById,
		activitySessionsById,
		activitiesById: new Map(activitiesRaw.map(activity => [activity.id, activity])),
		classSubjectsRaw,
		subjectsRaw,
		staffMembersRaw,
		staffAssignmentsRaw,
		...teacherInstructorSources,
		resourcesRaw,
		resourceAssignmentsRaw,
	};
}

function mapLessonPlanningEvent(
	event: TimetableEventRaw,
	classGroupId: string,
	sources: PlanningSources,
): PlanningEvent | null {
	const lessonSessionId = lessonSessionIdForEvent(event) ?? event.id;
	const lessonSession = sources.lessonSessionsById.get(lessonSessionId);
	const classSubjectId = event.classSubjectId ?? lessonSession?.classSubjectId;
	const classSubject = classSubjectId ? sources.classSubjectsRaw.find(entry => entry.id === classSubjectId) : undefined;
	const subject = classSubject ? sources.subjectsRaw.find(entry => entry.id === classSubject.subjectId) : undefined;
	const resourceById = new Map(sources.resourcesRaw.map(resource => [resource.id, resource]));

	return {
		id: lessonSessionId,
		classId: classGroupId,
		scheduleId: lessonSession?.scheduleId ?? undefined,
		kind: 'lesson',
		title: event.title,
		subject: subject?.name ?? event.title,
		day: dayLabel(event.startsAt),
		start: formatTime(event.startsAt),
		end: formatTime(event.endsAt),
		startsAt: String(event.startsAt),
		endsAt: String(event.endsAt),
		room: roomName(
			sources.resourceAssignmentsRaw,
			resourceById,
			entry => entry.lessonSessionId === lessonSessionId,
		),
		teacher: planningInstructorName(sources, {
			classSubjectId,
			staffMatch: entry => entry.lessonSessionId === lessonSessionId
				|| (classSubjectId ? entry.classSubjectId === classSubjectId : false),
		}),
		status: event.status ?? lessonSession?.status,
		timetableGenerated: lessonSession?.timetableGenerated ?? null,
	};
}

function mapActivityPlanningEvent(
	event: TimetableEventRaw,
	classGroupId: string,
	sources: PlanningSources,
): PlanningEvent | null {
	const activitySessionId = activitySessionIdForEvent(event) ?? event.id;
	const activitySession = sources.activitySessionsById.get(activitySessionId);
	const activityId = event.activityId ?? activitySession?.activityId;
	const activity = activityId ? sources.activitiesById.get(activityId) : undefined;
	const staffById = new Map(sources.staffMembersRaw.map(member => [member.id, member]));
	const resourceById = new Map(sources.resourcesRaw.map(resource => [resource.id, resource]));

	return {
		id: activitySessionId,
		classId: classGroupId,
		scheduleId: activitySession?.scheduleId ?? undefined,
		kind: 'activity',
		title: event.title,
		subject: activity?.name ?? event.title,
		day: dayLabel(event.startsAt),
		start: formatTime(event.startsAt),
		end: formatTime(event.endsAt),
		startsAt: String(event.startsAt),
		endsAt: String(event.endsAt),
		room: roomName(
			sources.resourceAssignmentsRaw,
			resourceById,
			entry => entry.activitySessionId === activitySessionId,
		),
		teacher: staffName(
			sources.staffAssignmentsRaw,
			staffById,
			entry => entry.activitySessionId === activitySessionId,
		) === 'Non assigné' && activity?.coach
			? activity.coach
			: staffName(
					sources.staffAssignmentsRaw,
					staffById,
					entry => entry.activitySessionId === activitySessionId,
				),
		status: event.status ?? activitySession?.status,
	};
}

function mapAssessmentPlanningEvent(
	event: TimetableEventRaw,
	classGroupId: string,
	sources: PlanningSources,
): PlanningEvent | null {
	const assessmentId = assessmentIdForEvent(event) ?? event.id;
	const classSubject = event.classSubjectId
		? sources.classSubjectsRaw.find(entry => entry.id === event.classSubjectId)
		: undefined;
	const subject = classSubject
		? sources.subjectsRaw.find(entry => entry.id === classSubject.subjectId)
		: undefined;
	const resourceById = new Map(sources.resourcesRaw.map(resource => [resource.id, resource]));

	return {
		id: assessmentId,
		classId: classGroupId,
		kind: 'assessment',
		title: event.title,
		subject: subject?.name ?? event.title,
		day: dayLabel(event.startsAt),
		start: formatTime(event.startsAt),
		end: formatTime(event.endsAt),
		startsAt: String(event.startsAt),
		endsAt: String(event.endsAt),
		room: roomName(
			sources.resourceAssignmentsRaw,
			resourceById,
			entry => entry.assessmentId === assessmentId,
		),
		teacher: planningInstructorName(sources, {
			classSubjectId: event.classSubjectId ?? undefined,
			staffMatch: entry => entry.assessmentId === assessmentId
				|| (event.classSubjectId ? entry.classSubjectId === event.classSubjectId : false),
		}),
	};
}

export function mapPlanningEvents(
	classGroupId: string,
	sources: PlanningSources,
): PlanningEvent[] {
	return sources.timetableEventsRaw
		.filter(event => event.classGroupId === classGroupId && TIMETABLE_EVENT_KINDS.has(event.kind))
		.map((event) => {
			switch (event.kind) {
				case 'lesson':
					return mapLessonPlanningEvent(event, classGroupId, sources);
				case 'activity':
					return mapActivityPlanningEvent(event, classGroupId, sources);
				case 'assessment':
					return mapAssessmentPlanningEvent(event, classGroupId, sources);
				default:
					return null;
			}
		})
		.filter((event): event is PlanningEvent => event !== null)
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
	const timetableEvents = mapPlanningEvents(classGroupId, sources);
	const homeworkEvents = mapHomeworkDuePlanningEvents(classGroupId, homeworkSources, range);
	return [...timetableEvents, ...homeworkEvents].sort(comparePlanningEvents);
}

function comparePlanningEvents(left: PlanningEvent, right: PlanningEvent): number {
	const dayOrder = DAY_LABELS.indexOf(left.day) - DAY_LABELS.indexOf(right.day);
	if (dayOrder !== 0) {
		return dayOrder;
	}
	return left.start.localeCompare(right.start);
}

export function findPlanningEventById(
	events: PlanningEvent[],
	id: string,
): PlanningEvent | undefined {
	return events.find(event => event.id === id);
}

export { planningEventId };
