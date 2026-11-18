import type { components } from '$lib/api/schema';
import type { getBrowserSchoolClient } from '$lib/api/school-client';
import type { PlanningEvent, Student } from '$lib/types/school';
import type {
	SessionAttendanceRow,
	SessionAttendanceStatus,
	SessionDetail,
	SessionLogbook,
	SessionSubjectMatterOption,
	SessionSubjectMatterStatus,
} from '$lib/types/session-detail';
import {
	entitiesByIds,
	listAllEntityPages,
	progressForLessonSessions,
	recordsForFieldIds,
} from '$lib/api/entity-list-filters';
import { fetchClassPeopleSources, mapStudents } from '$lib/api/people-data';
import { ApiError } from '@maya-invest/edaya-api-client';

type SchoolClient = ReturnType<typeof getBrowserSchoolClient>;
type LessonSessionRaw = components['schemas']['LessonSession'];
type ActivitySessionRaw = components['schemas']['ActivitySession'];
type AssessmentRaw = components['schemas']['Assessment'];
type ClassSubjectProgressRaw = components['schemas']['ClassSubjectProgress'];
type ClassSubjectMatterRaw = components['schemas']['ClassSubjectMatter'];
type SubjectMatterRaw = components['schemas']['SubjectMatter'];
type AttendanceRaw = components['schemas']['Attendance'];

function formatDate(value: unknown): string {
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

export function buildSessionSubjectMatters(
	classSubjectMattersRaw: ClassSubjectMatterRaw[],
	subjectMattersRaw: SubjectMatterRaw[],
	_progressRaw: ClassSubjectProgressRaw[] = [],
): SessionSubjectMatterOption[] {
	const subjectMatterById = new Map(subjectMattersRaw.map(entry => [entry.id, entry]));
	return classSubjectMattersRaw
		.map((link) => {
			const subjectMatter = subjectMatterById.get(link.subjectMatterId);
			if (!subjectMatter) {
				return null;
			}

			return {
				id: link.id,
				name: subjectMatter.name,
				sequenceOrder: subjectMatter.sequenceOrder,
				status: link.status as SessionSubjectMatterStatus,
				completedPercentage: link.completedPercentage,
			} satisfies SessionSubjectMatterOption;
		})
		.filter((entry): entry is SessionSubjectMatterOption => entry !== null)
		.sort((a, b) => a.sequenceOrder - b.sequenceOrder || a.name.localeCompare(b.name));
}

function mapLogbook(
	session: LessonSessionRaw,
	progressRaw: ClassSubjectProgressRaw[],
	classSubjectMattersRaw: ClassSubjectMatterRaw[],
	subjectMattersRaw: SubjectMatterRaw[],
): SessionLogbook | undefined {
	if (!session.sessionNote && progressRaw.length === 0)
		return undefined;

	return {
		id: session.id,
		content: readableLogbookNote(session.sessionNote) ?? '',
		chapters: progressRaw.map((entry) => {
			const link = classSubjectMattersRaw.find(row => row.id === entry.classSubjectMatterId);
			const name = subjectMattersRaw.find(row => row.id === link?.subjectMatterId)?.name ?? session.displayLabel;
			return { matterId: entry.classSubjectMatterId, name, completed: entry.completed, notes: entry.notes };
		}),
	};
}

export function buildSessionDetail(input: {
	session: LessonSessionRaw;
	students: Student[];
	attendanceRaw: AttendanceRaw[];
	classSubjectMattersRaw?: ClassSubjectMatterRaw[];
	subjectMattersRaw?: SubjectMatterRaw[];
	progressRaw?: ClassSubjectProgressRaw[];
}): SessionDetail {
	const {
		session,
		students,
		attendanceRaw,
		classSubjectMattersRaw = [],
		subjectMattersRaw = [],
		progressRaw = [],
	} = input;
	const classSubjectId = session.classSubjectId;
	const date = formatDate(session.startsAt);
	const attendanceByStudent = new Map(
		attendanceRaw.map(record => [record.studentId, record]),
	);

	return {
		sessionId: session.id,
		classGroupId: session.classGroupId,
		classSubjectId,
		date,
		attendance: students.map((student) => {
			const record = attendanceByStudent.get(student.id);
			return {
				studentId: student.id,
				studentName: student.name,
				studentInitials: student.initials,
				attendanceId: record?.id,
				status: record?.status as SessionAttendanceStatus | undefined,
			} satisfies SessionAttendanceRow;
		}),
		subjectMatters: buildSessionSubjectMatters(
			classSubjectMattersRaw,
			subjectMattersRaw,
			progressRaw,
		),
		logbook: mapLogbook(session, progressRaw, classSubjectMattersRaw, subjectMattersRaw),
	};
}

export async function loadSessionDetail(
	client: SchoolClient,
	lessonSessionId: string,
	options: { attendanceOnly?: boolean } = {},
): Promise<SessionDetail | null> {
	let session: LessonSessionRaw;
	try {
		session = await client.entities.lessonSessions.get(lessonSessionId);
	}
	catch (error) {
		if (error instanceof ApiError && error.status === 404)
			return null;
		throw error;
	}

	const roster = await client.queries.getClassSubjectRoster({ classSubjectId: session.classSubjectId, at: String(session.startsAt) });
	const classStudents = mapStudents({ studentsRaw: await listAllEntityPages(query => client.entities.students.list(query), { baseQuery: entitiesByIds(roster.students.map(row => row.id)) }), enrollmentsRaw: [], guardiansRaw: [], linksRaw: [] });
	const classSubjectId = session.classSubjectId;
	const [attendanceRaw, classSubjectMattersRaw, progressRaw] = await Promise.all([
		client.entities.attendance.list(recordsForFieldIds('lessonSessionId', [lessonSessionId])),
		options.attendanceOnly ? [] : listAllEntityPages(query => client.entities.classSubjectMatters.list(query), { baseQuery: recordsForFieldIds('classSubjectId', [classSubjectId]) }),
		options.attendanceOnly ? [] : listAllEntityPages(query => client.entities.classSubjectProgress.list(query), { baseQuery: progressForLessonSessions([lessonSessionId]) }),
	]);
	const subjectMatterIds = [...new Set((classSubjectMattersRaw ?? []).map(entry => entry.subjectMatterId))];
	const subjectMattersRaw = subjectMatterIds.length > 0
		? await listAllEntityPages(query => client.entities.subjectMatters.list(query), { baseQuery: entitiesByIds(subjectMatterIds) })
		: [];

	return buildSessionDetail({
		session,
		students: classStudents,
		attendanceRaw: attendanceRaw ?? [],
		classSubjectMattersRaw: classSubjectMattersRaw ?? [],
		subjectMattersRaw: subjectMattersRaw ?? [],
		progressRaw: progressRaw ?? [],
	});
}

export function buildOccurrenceAttendanceDetail(input: {
	occurrenceId: string;
	classGroupId: string;
	classSubjectId: string;
	startsAt: unknown;
	students: Student[];
	attendanceRaw: AttendanceRaw[];
	notes?: string | null;
	displayLabel?: string;
}): SessionDetail {
	const date = formatDate(input.startsAt);
	const attendanceByStudent = new Map(
		input.attendanceRaw.map(record => [record.studentId, record]),
	);

	return {
		sessionId: input.occurrenceId,
		classGroupId: input.classGroupId,
		classSubjectId: input.classSubjectId,
		date,
		attendance: input.students.map((student) => {
			const record = attendanceByStudent.get(student.id);
			return {
				studentId: student.id,
				studentName: student.name,
				studentInitials: student.initials,
				attendanceId: record?.id,
				status: record?.status as SessionAttendanceStatus | undefined,
			} satisfies SessionAttendanceRow;
		}),
		subjectMatters: [],
		logbook: input.notes
			? {
					id: input.occurrenceId,
					content: input.notes,

				}
			: undefined,
	};
}

async function loadActivitySessionDetail(
	client: SchoolClient,
	activitySessionId: string,
): Promise<SessionDetail | null> {
	let session: ActivitySessionRaw;
	try {
		session = await client.entities.activitySessions.get(activitySessionId);
	}
	catch (error) {
		if (error instanceof ApiError && error.status === 404)
			return null;
		throw error;
	}

	const classStudents = mapStudents(await fetchClassPeopleSources(client, session.classGroupId));
	const attendanceRaw = await client.entities.attendance.list(
		recordsForFieldIds('activitySessionId', [activitySessionId]),
	);

	return buildOccurrenceAttendanceDetail({
		occurrenceId: session.id,
		classGroupId: session.classGroupId,
		classSubjectId: '',
		startsAt: session.startsAt,
		students: classStudents,
		attendanceRaw: attendanceRaw ?? [],
		notes: session.notes,
		displayLabel: session.displayLabel,
	});
}

async function loadAssessmentOccurrenceDetail(
	client: SchoolClient,
	assessmentId: string,
): Promise<SessionDetail | null> {
	let assessment: AssessmentRaw;
	try {
		assessment = await client.entities.assessments.get(assessmentId);
	}
	catch (error) {
		if (error instanceof ApiError && error.status === 404)
			return null;
		throw error;
	}

	const at = assessment.dueAt ?? assessment.startsAt ?? (assessment.lessonSessionId ? (await client.entities.lessonSessions.get(assessment.lessonSessionId)).startsAt : undefined);
	if (!at)
		throw new Error('Assessment date is required');
	const roster = await client.queries.getClassSubjectRoster({ classSubjectId: assessment.classSubjectId, at: String(at) });
	const classStudents = mapStudents({ studentsRaw: await listAllEntityPages(query => client.entities.students.list(query), { baseQuery: entitiesByIds(roster.students.map(row => row.id)) }), enrollmentsRaw: [], guardiansRaw: [], linksRaw: [] });
	const attendanceRaw = await client.entities.attendance.list(
		recordsForFieldIds('assessmentId', [assessmentId]),
	);

	return buildOccurrenceAttendanceDetail({
		occurrenceId: assessment.id,
		classGroupId: assessment.classGroupId,
		classSubjectId: assessment.classSubjectId,
		startsAt: assessment.startsAt ?? assessment.dueAt,
		students: classStudents,
		attendanceRaw: attendanceRaw ?? [],
		notes: assessment.description,
		displayLabel: assessment.title,
	});
}

export async function loadPlanningOccurrenceDetail(
	client: SchoolClient,
	event: Pick<PlanningEvent, 'id' | 'kind'>,
	options: { attendanceOnly?: boolean } = {},
): Promise<SessionDetail | null> {
	switch (event.kind) {
		case 'activity':
			return loadActivitySessionDetail(client, event.id);
		case 'assessment':
			return loadAssessmentOccurrenceDetail(client, event.id);
		case 'lesson':
		default:
			return loadSessionDetail(client, event.id, options);
	}
}

/** Parent-facing lesson text. Structured teacher notes stay out of the raw JSON. */
export function readableLogbookNote(sessionNote: string | null | undefined): string {
	const value = sessionNote?.trim() ?? '';
	if (!value.startsWith('{"edayaLogbook":'))
		return value;
	try {
		const decoded = JSON.parse(value) as {
			edayaLogbook?: { content?: string; objectives?: string[]; homework?: string };
		};
		const envelope = decoded.edayaLogbook;
		if (!envelope)
			return value;
		return [envelope.content, ...(envelope.objectives ?? []), envelope.homework]
			.map(part => part?.trim())
			.filter((part): part is string => Boolean(part))
			.join('\n');
	}
	catch {
		return value;
	}
}
