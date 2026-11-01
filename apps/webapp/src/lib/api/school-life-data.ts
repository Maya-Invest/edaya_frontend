import type { components } from '$lib/api/schema';
import type { getBrowserSchoolClient } from '$lib/api/school-client';
import type { AbsenceRecord, Incident, SchoolYearEvent, Student } from '$lib/types/school';
import {
	listAllEntityPages,
	listAllEntityPagesByIds,
	listAllEntityPagesForIdFilters,
	uniqueIds,
} from '$lib/api/entity-list-filters';
import { loadClassPeopleData, mapPeopleData } from '$lib/api/people-data';

type SchoolClient = ReturnType<typeof getBrowserSchoolClient>;

type CalendarEventRaw = components['schemas']['CalendarEvent'];
type IncidentRaw = components['schemas']['Incident'];
type InvolvementRaw = components['schemas']['StudentIncidentInvolvement'];
type DisciplinaryActionRaw = components['schemas']['DisciplinaryAction'];
type AttendanceRaw = components['schemas']['Attendance'];
type LessonSessionRaw = components['schemas']['LessonSession'];
type ClassSubjectRaw = components['schemas']['ClassSubject'];
type SubjectRaw = components['schemas']['Subject'];

export interface SchoolLifeSources {
	calendarEventsRaw: CalendarEventRaw[];
	incidentsRaw: IncidentRaw[];
	involvementsRaw: InvolvementRaw[];
	attendanceRaw: AttendanceRaw[];
	sessionsRaw: LessonSessionRaw[];
	classSubjectsRaw: ClassSubjectRaw[];
	subjectsRaw: SubjectRaw[];
}

const CALENDAR_KIND_TO_TYPE: Record<string, SchoolYearEvent['type']> = {
	holiday: 'holiday',
	break: 'vacation',
	other: 'closure',
	event: 'ceremony',
};

export function mapCalendarEventType(kind: string): SchoolYearEvent['type'] {
	return CALENDAR_KIND_TO_TYPE[kind] ?? 'ceremony';
}

export function mapCalendarEventDescription(event: CalendarEventRaw): string {
	if (typeof event.description === 'string' && event.description.trim().length > 0) {
		return event.description;
	}

	return '';
}

function formatDate(value: unknown): string {
	if (!value) {
		return '';
	}
	if (typeof value === 'string') {
		return value.slice(0, 10);
	}
	if (value instanceof Date) {
		const year = value.getUTCFullYear();
		const month = `${value.getUTCMonth() + 1}`.padStart(2, '0');
		const day = `${value.getUTCDate()}`.padStart(2, '0');
		return `${year}-${month}-${day}`;
	}
	return String(value).slice(0, 10);
}

function formatTime(value: unknown): string {
	const date = value instanceof Date ? value : new Date(String(value));
	const hours = `${date.getUTCHours()}`.padStart(2, '0');
	const minutes = `${date.getUTCMinutes()}`.padStart(2, '0');
	return `${hours}:${minutes}`;
}

export function mapCalendarEvents(eventsRaw: CalendarEventRaw[]): SchoolYearEvent[] {
	const schoolEvents: SchoolYearEvent[] = [];
	const classGroups = new Map<string, {
		primary: CalendarEventRaw;
		classIds: string[];
		linkedIds: string[];
	}>();

	for (const event of eventsRaw) {
		const type = mapCalendarEventType(event.kind);
		const start = formatDate(event.startDate);
		const end = formatDate(event.endDate);

		if (event.scopeKind === 'school' || !event.scopeId) {
			schoolEvents.push({
				id: event.id,
				title: event.title,
				date: start,
				endDate: end !== start ? end : undefined,
				type,
				description: mapCalendarEventDescription(event),
				scope: 'all',
				blocksTimetable: event.isNonSchoolDay,
			});
			continue;
		}

		const classId = String(event.scopeId);
		const key = [
			event.title.trim(),
			start,
			end,
			event.kind,
			mapCalendarEventDescription(event),
		].join('|');

		const bucket = classGroups.get(key);
		if (bucket) {
			if (!bucket.classIds.includes(classId)) {
				bucket.classIds.push(classId);
				bucket.linkedIds.push(event.id);
			}
		}
		else {
			classGroups.set(key, {
				primary: event,
				classIds: [classId],
				linkedIds: [event.id],
			});
		}
	}

	const groupedClassEvents = [...classGroups.values()].map(({ primary, classIds, linkedIds }) => {
		const start = formatDate(primary.startDate);
		const end = formatDate(primary.endDate);
		return {
			id: primary.id,
			linkedIds: linkedIds.length > 1 ? linkedIds : undefined,
			title: primary.title,
			date: start,
			endDate: end !== start ? end : undefined,
			type: mapCalendarEventType(primary.kind),
			description: mapCalendarEventDescription(primary),
			scope: classIds.sort(),
			blocksTimetable: primary.isNonSchoolDay,
		} satisfies SchoolYearEvent;
	});

	return [...schoolEvents, ...groupedClassEvents]
		.sort((left, right) => left.date.localeCompare(right.date));
}

export function mapIncidentCategory(incident: IncidentRaw): Incident['category'] {
	switch (incident.kind) {
		case 'positive':
			return 'Behavior';
		case 'minor_infraction':
			return 'Tardiness';
		case 'major_infraction':
			return 'Conflict';
		default:
			return 'Other';
	}
}

export function mapIncidentSeverity(incident: IncidentRaw): Incident['severity'] {
	switch (incident.kind) {
		case 'positive':
			return 'low';
		case 'minor_infraction':
			return 'low';
		case 'major_infraction':
			return 'medium';
		default:
			return 'high';
	}
}

export function mapIncidents(
	incidentsRaw: IncidentRaw[],
	involvementsRaw: InvolvementRaw[],
): Incident[] {
	const involvementsByIncident = new Map<string, InvolvementRaw[]>();
	for (const involvement of involvementsRaw) {
		const bucket = involvementsByIncident.get(involvement.incidentId) ?? [];
		bucket.push(involvement);
		involvementsByIncident.set(involvement.incidentId, bucket);
	}

	return incidentsRaw
		.map((incident) => {
			const involvements = involvementsByIncident.get(incident.id) ?? [];
			const primary = involvements.find(entry => entry.role === 'subject') ?? involvements[0];
			const category = mapIncidentCategory(incident);
			const involvedStudentIds = uniqueIds(involvements.map(entry => entry.studentId));

			return {
				id: incident.id,
				title: incident.title,
				description: incident.description,
				classGroupId: incident.classGroupId,
				lessonSessionId: incident.lessonSessionId,
				reporterId: incident.reporterId,
				resolvedAt: incident.resolvedAt instanceof Date ? incident.resolvedAt.toISOString() : typeof incident.resolvedAt === 'string' ? incident.resolvedAt : null,
				resolvedByStaffId: incident.resolvedByStaffId,
				resolutionNotes: incident.resolutionNotes,
				studentId: primary?.studentId ?? '',
				involvedStudentIds,
				involvedCount: involvedStudentIds.length,
				date: formatDate(incident.date),
				kind: incident.kind,
				category,
				severity: mapIncidentSeverity(incident),
				summary: String(incident.title ?? '').trim() || incident.description,
				status: incident.status ?? 'open',
			} satisfies Incident;
		})
		.sort((left, right) => right.date.localeCompare(left.date));
}

export function mapAbsences(sources: SchoolLifeSources): AbsenceRecord[] {
	const subjectById = new Map(sources.subjectsRaw.map(subject => [subject.id, subject]));
	const classSubjectById = new Map(sources.classSubjectsRaw.map(entry => [entry.id, entry]));
	const sessionById = new Map(sources.sessionsRaw.map(session => [session.id, session]));

	return sources.attendanceRaw
		.filter(record => record.status === 'absent')
		.map((record) => {
			const session = record.lessonSessionId
				? sessionById.get(record.lessonSessionId)
				: undefined;
			const classSubject = session?.classSubjectId
				? classSubjectById.get(session.classSubjectId)
				: undefined;
			const subject = classSubject ? subjectById.get(classSubject.subjectId) : undefined;

			return {
				id: record.id,
				studentId: record.studentId,
				date: formatDate(record.date ?? session?.startsAt),
				time: session ? formatTime(session.startsAt) : '08:30',
				subject: subject?.name ?? 'Cours',
				eventType: 'Cours',
				reason: typeof record.reason === 'string' ? record.reason : undefined,
			} satisfies AbsenceRecord;
		})
		.sort((left, right) => `${right.date}${right.time}`.localeCompare(`${left.date}${left.time}`));
}

export async function loadCalendarEvents(
	client: SchoolClient,
	academicYearId: string,
	schoolId = '',
): Promise<SchoolYearEvent[]> {
	if (!academicYearId) {
		return [];
	}
	const eventsRaw = await listAllEntityPages(
		query => client.entities.calendarEvents.list(query),
		{ baseQuery: schoolId ? { schoolId, academicYearId } : { academicYearId } },
	);
	return mapCalendarEvents(eventsRaw ?? []);
}

export async function loadIncidentRouteData(
	client: SchoolClient,
	scope: { schoolId: string; academicYearId: string },
): Promise<{ incidents: Incident[]; students: Student[] }> {
	const incidentsRaw = await listAllEntityPages(
		query => client.entities.incidents.list(query),
		{ baseQuery: { schoolId: scope.schoolId } },
	);
	const incidentIds = uniqueIds(incidentsRaw.map(incident => incident.id));
	const involvementsRaw = await listAllEntityPagesForIdFilters(
		query => client.entities.studentIncidentInvolvements.list(query),
		[{ field: 'incidentId', ids: incidentIds }],
	);
	const studentIds = uniqueIds(involvementsRaw.map(involvement => involvement.studentId));
	const [studentsRaw, enrollmentsRaw] = studentIds.length > 0
		? await Promise.all([
				listAllEntityPagesByIds(query => client.entities.students.list(query), studentIds),
				listAllEntityPagesForIdFilters(
					query => client.entities.enrollments.list(query),
					[{ field: 'studentId', ids: studentIds }],
					{ extraQuery: { academicYearId: scope.academicYearId, status: 'active' } },
				),
			])
		: [[], []];
	const { students } = mapPeopleData({
		studentsRaw,
		enrollmentsRaw,
		guardiansRaw: [],
		linksRaw: [],
	});

	return {
		incidents: mapIncidents(incidentsRaw, involvementsRaw),
		students,
	};
}

export async function loadIncidentById(
	client: SchoolClient,
	incidentId: string,
): Promise<Incident | null> {
	try {
		const incident = await client.entities.incidents.get(incidentId);
		if (!incident) {
			return null;
		}
		const involvementsRaw = await listAllEntityPagesForIdFilters(
			query => client.entities.studentIncidentInvolvements.list(query),
			[{ field: 'incidentId', ids: [incidentId] }],
		);
		return mapIncidents([incident], involvementsRaw)[0] ?? null;
	}
	catch {
		return null;
	}
}

export interface IncidentResolveModalData {
	incident: IncidentRaw;
	involvements: InvolvementRaw[];
	disciplinaryActions: DisciplinaryActionRaw[];
	students: Student[];
}

export async function loadIncidentResolveModalData(
	client: SchoolClient,
	incidentId: string,
	periodId: string,
): Promise<IncidentResolveModalData> {
	const incident = await client.entities.incidents.get(incidentId);
	const [involvements, disciplinaryActions] = await Promise.all([
		listAllEntityPagesForIdFilters(
			query => client.entities.studentIncidentInvolvements.list(query),
			[{ field: 'incidentId', ids: [incidentId] }],
		),
		listAllEntityPages(query => client.entities.disciplinaryActions.list(query), {
			baseQuery: { schoolId: incident.schoolId },
		}),
	]);

	let students: Student[] = [];
	if (incident.classGroupId) {
		const classPeople = await loadClassPeopleData(client, incident.classGroupId, periodId);
		students = classPeople.students;
	}
	else {
		const studentIds = uniqueIds((involvements ?? []).map(entry => entry.studentId));
		if (studentIds.length > 0) {
			const studentsRaw = await listAllEntityPagesByIds(
				query => client.entities.students.list(query),
				studentIds,
			);
			students = mapPeopleData({
				studentsRaw: studentsRaw ?? [],
				enrollmentsRaw: [],
				guardiansRaw: [],
				linksRaw: [],
			}).students;
		}
	}

	return {
		incident,
		involvements: involvements ?? [],
		disciplinaryActions: (disciplinaryActions ?? []).filter(action => action.kind === 'sanction'),
		students,
	};
}

export async function loadIncidentInvolvements(
	client: SchoolClient,
	incidentId: string,
): Promise<InvolvementRaw[]> {
	const involvements = await listAllEntityPagesForIdFilters(
		query => client.entities.studentIncidentInvolvements.list(query),
		[{ field: 'incidentId', ids: [incidentId] }],
	);
	return involvements;
}

export { loadIncidentSanctions } from '$lib/api/student-drawer-data';

export async function loadAbsences(
	client: SchoolClient,
	classGroupIds: readonly string[],
): Promise<AbsenceRecord[]> {
	if (classGroupIds.length === 0) {
		return [];
	}

	const sessionsRaw = await listAllEntityPagesForIdFilters(
		query => client.entities.lessonSessions.list(query),
		[{ field: 'classGroupId', ids: classGroupIds }],
	);
	const sessionIds = uniqueIds(sessionsRaw.map(session => session.id));
	const classSubjectIds = uniqueIds(
		sessionsRaw.map(session => session.classSubjectId).filter((id): id is string => Boolean(id)),
	);
	const [attendanceRaw, classSubjectsRaw] = await Promise.all([
		listAllEntityPagesForIdFilters(
			query => client.entities.attendance.list(query),
			[{ field: 'lessonSessionId', ids: sessionIds }],
			{ extraQuery: { status: 'absent' } },
		),
		listAllEntityPagesByIds(query => client.entities.classSubjects.list(query), classSubjectIds),
	]);
	const subjectIds = uniqueIds(classSubjectsRaw.map(classSubject => classSubject.subjectId));
	const subjectsRaw = await listAllEntityPagesByIds(
		query => client.entities.subjects.list(query),
		subjectIds,
	);

	return mapAbsences({
		calendarEventsRaw: [],
		incidentsRaw: [],
		involvementsRaw: [],
		attendanceRaw: attendanceRaw ?? [],
		sessionsRaw,
		classSubjectsRaw: classSubjectsRaw ?? [],
		subjectsRaw: subjectsRaw ?? [],
	});
}
