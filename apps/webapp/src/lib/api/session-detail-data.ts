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
import { entitiesByIds, recordsForFieldIds } from '$lib/api/entity-list-filters';
import { fetchClassPeopleSources, mapStudents } from '$lib/api/people-data';
import { fetchClassTeachingLogSources } from '$lib/api/teaching-log-data';

type SchoolClient = ReturnType<typeof getBrowserSchoolClient>;
type SessionRaw = components['schemas']['Session'];
type ClassLogbookEntryRaw = components['schemas']['ClassLogbookEntry'];
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

function mapLogbook(entry: ClassLogbookEntryRaw): SessionLogbook {
	return {
		id: entry.id,
		chapter: entry.chapter,
		content: entry.content,
		objectives: [...(entry.objectives ?? [])],
		homework: entry.homework ?? undefined,
		progress: entry.progress,
	};
}

export function buildSessionDetail(input: {
	session: SessionRaw;
	students: Student[];
	attendanceRaw: AttendanceRaw[];
	logSources: Awaited<ReturnType<typeof fetchClassTeachingLogSources>>;
	classSubjectMattersRaw?: ClassSubjectMatterRaw[];
	subjectMattersRaw?: SubjectMatterRaw[];
}): SessionDetail {
	const { session, students, attendanceRaw, logSources, classSubjectMattersRaw = [], subjectMattersRaw = [] } = input;
	const classSubjectId = session.classSubjectId ?? '';
	const date = formatDate(session.startsAt);
	const attendanceByStudent = new Map(
		attendanceRaw.map(record => [record.studentId, record]),
	);
	const logbookRaw = classSubjectId
		? logSources.classLogbookEntriesRaw.find(entry =>
				entry.classSubjectId === classSubjectId && formatDate(entry.date) === date,
			)
		: undefined;

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
		subjectMatters: buildSessionSubjectMatters(classSubjectMattersRaw, subjectMattersRaw),
		logbook: logbookRaw ? mapLogbook(logbookRaw) : undefined,
	};
}

export async function loadSessionDetail(
	client: SchoolClient,
	sessionId: string,
): Promise<SessionDetail | null> {
	let session: SessionRaw;
	try {
		session = await client.entities.sessions.get(sessionId);
	}
	catch {
		return null;
	}

	const classStudents = mapStudents(await fetchClassPeopleSources(client, session.classGroupId));
	const classSubjectId = session.classSubjectId ?? '';
	const [attendanceRaw, logSources, classSubjectMattersRaw] = await Promise.all([
		client.entities.attendance.list(recordsForFieldIds('sessionId', [sessionId])),
		fetchClassTeachingLogSources(client, session.classGroupId),
		classSubjectId
			? client.entities.classSubjectMatters.list(recordsForFieldIds('classSubjectId', [classSubjectId]))
			: Promise.resolve([]),
	]);
	const subjectMatterIds = [...new Set((classSubjectMattersRaw ?? []).map(entry => entry.subjectMatterId))];
	const subjectMattersRaw = subjectMatterIds.length > 0
		? await client.entities.subjectMatters.list(entitiesByIds(subjectMatterIds))
		: [];

	return buildSessionDetail({
		session,
		students: classStudents,
		attendanceRaw: attendanceRaw ?? [],
		logSources,
		classSubjectMattersRaw: classSubjectMattersRaw ?? [],
		subjectMattersRaw: subjectMattersRaw ?? [],
	});
}
