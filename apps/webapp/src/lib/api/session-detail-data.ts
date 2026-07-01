import type { components } from '$lib/api/schema';
import type { getBrowserSchoolClient } from '$lib/api/school-client';
import type { Student } from '$lib/types/school';
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
	progressForLessonSessions,
	recordsForFieldIds,
} from '$lib/api/entity-list-filters';
import { fetchClassPeopleSources, mapStudents } from '$lib/api/people-data';

type SchoolClient = ReturnType<typeof getBrowserSchoolClient>;
type LessonSessionRaw = components['schemas']['LessonSession'];
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
	progressRaw: ClassSubjectProgressRaw[] = [],
): SessionSubjectMatterOption[] {
	const subjectMatterById = new Map(subjectMattersRaw.map(entry => [entry.id, entry]));
	const progressByMatterId = new Map(
		progressRaw.map(entry => [entry.classSubjectMatterId, entry]),
	);

	return classSubjectMattersRaw
		.map((link) => {
			const subjectMatter = subjectMatterById.get(link.subjectMatterId);
			if (!subjectMatter) {
				return null;
			}
			const progress = progressByMatterId.get(link.id);
			return {
				id: link.id,
				name: subjectMatter.name,
				sequenceOrder: subjectMatter.sequenceOrder,
				status: (progress ? 'in_progress' : link.status) as SessionSubjectMatterStatus,
				completedPercentage: progress?.completedPercentage ?? link.completedPercentage,
			} satisfies SessionSubjectMatterOption;
		})
		.filter((entry): entry is SessionSubjectMatterOption => entry !== null)
		.sort((a, b) => a.sequenceOrder - b.sequenceOrder || a.name.localeCompare(b.name));
}

function mapLogbook(
	session: LessonSessionRaw,
	progressRaw: ClassSubjectProgressRaw[],
	classSubjectMattersRaw: ClassSubjectMatterRaw[],
): SessionLogbook | undefined {
	const primaryProgress = progressRaw[0];
	const matterLink = primaryProgress
		? classSubjectMattersRaw.find(entry => entry.id === primaryProgress.classSubjectMatterId)
		: undefined;

	if (!session.sessionNote && !primaryProgress) {
		return undefined;
	}

	return {
		id: primaryProgress?.id ?? session.id,
		chapter: matterLink?.id ?? session.displayLabel,
		content: session.sessionNote ?? primaryProgress?.notes ?? '',
		objectives: primaryProgress?.notes ? [primaryProgress.notes] : [],
		homework: undefined,
		progress: primaryProgress?.completedPercentage ?? 0,
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
		logbook: mapLogbook(session, progressRaw, classSubjectMattersRaw),
	};
}

export async function loadSessionDetail(
	client: SchoolClient,
	lessonSessionId: string,
): Promise<SessionDetail | null> {
	let session: LessonSessionRaw;
	try {
		session = await client.entities.lessonSessions.get(lessonSessionId);
	}
	catch {
		return null;
	}

	const classStudents = mapStudents(await fetchClassPeopleSources(client, session.classGroupId));
	const classSubjectId = session.classSubjectId;
	const [attendanceRaw, classSubjectMattersRaw, progressRaw] = await Promise.all([
		client.entities.attendance.list(recordsForFieldIds('lessonSessionId', [lessonSessionId])),
		client.entities.classSubjectMatters.list(recordsForFieldIds('classSubjectId', [classSubjectId])),
		client.entities.classSubjectProgress.list(progressForLessonSessions([lessonSessionId])),
	]);
	const subjectMatterIds = [...new Set((classSubjectMattersRaw ?? []).map(entry => entry.subjectMatterId))];
	const subjectMattersRaw = subjectMatterIds.length > 0
		? await client.entities.subjectMatters.list(entitiesByIds(subjectMatterIds))
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
