import type { components } from '$lib/api/schema';
import type { getBrowserSchoolClient } from '$lib/api/school-client';
import type {
	IncidentSanctionRow,
	StudentAttendanceHistoryItem,
	StudentEnrollmentHistoryItem,
	StudentGradeRow,
} from '$lib/types/school';
import { mapAssessmentToEvaluation } from '$lib/api/assessment-mapping';
import {
	assessmentResultsForStudents,
	attendanceForStudents,
	disciplinaryActionsForIncident,
	entitiesByIds,
	enrollmentsForStudents,
	uniqueIds,
} from '$lib/api/entity-list-filters';

type SchoolClient = ReturnType<typeof getBrowserSchoolClient>;
type EnrollmentRaw = components['schemas']['StudentClassEnrollment'];
type AssessmentRaw = components['schemas']['Assessment'];
type AssessmentResultRaw = components['schemas']['AssessmentResult'];
type AttendanceRaw = components['schemas']['Attendance'];
type LessonSessionRaw = components['schemas']['LessonSession'];
type ActivitySessionRaw = components['schemas']['ActivitySession'];
type ClassSubjectRaw = components['schemas']['ClassSubject'];
type SubjectRaw = components['schemas']['Subject'];
type AttendanceOccurrenceRaw = components['schemas']['AttendanceOccurrence'];
type StudentDisciplinaryActionRaw = components['schemas']['StudentDisciplinaryAction'];
type DisciplinaryActionRaw = components['schemas']['DisciplinaryAction'];

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

function formatTime(value: unknown): string {
	if (!value) {
		return '—';
	}
	const date = value instanceof Date ? value : new Date(String(value));
	if (Number.isNaN(date.getTime())) {
		return '—';
	}
	const hours = `${date.getUTCHours()}`.padStart(2, '0');
	const minutes = `${date.getUTCMinutes()}`.padStart(2, '0');
	return `${hours}:${minutes}`;
}

export function mapStudentEnrollmentHistory(
	enrollmentsRaw: EnrollmentRaw[],
	classNames: ReadonlyMap<string, string>,
): StudentEnrollmentHistoryItem[] {
	return enrollmentsRaw
		.map(enrollment => ({
			id: enrollment.id,
			classGroupId: enrollment.classGroupId,
			className: classNames.get(enrollment.classGroupId) ?? enrollment.classGroupId,
			academicYearId: enrollment.academicYearId,
			status: enrollment.status,
			enrolledAt: formatDate(enrollment.enrolledAt ?? enrollment.createdAt),
			endedAt: enrollment.endedAt ? formatDate(enrollment.endedAt) : undefined,
			endReason: enrollment.endReason ?? null,
		}))
		.sort((left, right) => right.enrolledAt.localeCompare(left.enrolledAt));
}

export async function loadStudentEnrollmentHistory(
	client: SchoolClient,
	studentId: string,
): Promise<StudentEnrollmentHistoryItem[]> {
	const enrollmentsRaw = await client.entities.enrollments.list(enrollmentsForStudents([studentId]));
	const classIds = uniqueIds((enrollmentsRaw ?? []).map(enrollment => enrollment.classGroupId));
	const classGroupsRaw = classIds.length > 0
		? await client.entities.classGroups.list(entitiesByIds(classIds))
		: [];
	const classNames = new Map((classGroupsRaw ?? []).map(entry => [entry.id, entry.name]));
	return mapStudentEnrollmentHistory(enrollmentsRaw ?? [], classNames);
}

export function mapStudentGradeRows(
	resultsRaw: AssessmentResultRaw[],
	assessmentsRaw: AssessmentRaw[],
	subjectsRaw: SubjectRaw[],
	classSubjectsRaw: ClassSubjectRaw[],
): StudentGradeRow[] {
	const assessmentsById = new Map(assessmentsRaw.map(assessment => [assessment.id, assessment]));
	const subjectById = new Map(subjectsRaw.map(subject => [subject.id, subject]));
	const classSubjectById = new Map(classSubjectsRaw.map(entry => [entry.id, entry]));

	return resultsRaw
		.map((result) => {
			const assessment = assessmentsById.get(result.assessmentId);
			if (!assessment) {
				return null;
			}

			const classSubject = classSubjectById.get(assessment.classSubjectId);
			const subject = classSubject ? subjectById.get(classSubject.subjectId) : undefined;
			const evaluation = mapAssessmentToEvaluation(assessment, {
				subjectName: subject?.name ?? assessment.title,
				classSize: 0,
				results: [result],
			});

			return {
				assessmentId: assessment.id,
				classGroupId: assessment.classGroupId,
				title: evaluation.title,
				subject: evaluation.subject,
				date: evaluation.date,
				score: typeof result.score === 'number' ? result.score : null,
				outOf: evaluation.outOf,
				coefficient: evaluation.coefficient,
				kind: evaluation.kind,
			} satisfies StudentGradeRow;
		})
		.filter((row): row is StudentGradeRow => row !== null)
		.sort((left, right) => right.date.localeCompare(left.date));
}

export async function loadStudentGradeRows(
	client: SchoolClient,
	studentId: string,
): Promise<StudentGradeRow[]> {
	const resultsRaw = await client.entities.assessmentResults.list(
		assessmentResultsForStudents([studentId]),
	);
	const assessmentIds = uniqueIds((resultsRaw ?? []).map(result => result.assessmentId));
	if (assessmentIds.length === 0) {
		return [];
	}

	const assessmentsRaw = await client.entities.assessments.list(entitiesByIds(assessmentIds));
	const classSubjectIds = uniqueIds((assessmentsRaw ?? []).map(assessment => assessment.classSubjectId));
	const classSubjectsRaw = classSubjectIds.length > 0
		? await client.entities.classSubjects.list(entitiesByIds(classSubjectIds))
		: [];
	const subjectIds = uniqueIds((classSubjectsRaw ?? []).map(entry => entry.subjectId));
	const subjectsRaw = subjectIds.length > 0
		? await client.entities.subjects.list(entitiesByIds(subjectIds))
		: [];

	return mapStudentGradeRows(
		resultsRaw ?? [],
		assessmentsRaw ?? [],
		subjectsRaw ?? [],
		classSubjectsRaw ?? [],
	);
}

export function mapStudentAttendanceHistory(
	recordsRaw: AttendanceRaw[],
	occurrencesById: ReadonlyMap<string, AttendanceOccurrenceRaw>,
	lessonSessionsById: ReadonlyMap<string, LessonSessionRaw>,
	activitySessionsById: ReadonlyMap<string, ActivitySessionRaw>,
	assessmentsById: ReadonlyMap<string, AssessmentRaw>,
): StudentAttendanceHistoryItem[] {
	return recordsRaw
		.map((record) => {
			const isDaily = Boolean(record.attendanceId);
			let label = 'Appel du jour';
			let date = formatDate(record.date);
			let time = '—';

			if (record.attendanceId) {
				const occurrence = occurrencesById.get(record.attendanceId);
				label = occurrence?.displayLabel ?? label;
				date = formatDate(occurrence?.startsAt ?? record.date);
				time = formatTime(occurrence?.startsAt);
			}
			else if (record.lessonSessionId) {
				const session = lessonSessionsById.get(record.lessonSessionId);
				label = session?.displayLabel ?? 'Cours';
				date = formatDate(session?.startsAt ?? record.date);
				time = formatTime(session?.startsAt);
			}
			else if (record.activitySessionId) {
				const session = activitySessionsById.get(record.activitySessionId);
				label = session?.displayLabel ?? 'Activité';
				date = formatDate(session?.startsAt ?? record.date);
				time = formatTime(session?.startsAt);
			}
			else if (record.assessmentId) {
				const assessment = assessmentsById.get(record.assessmentId);
				label = assessment?.title ?? 'Évaluation';
				date = formatDate(assessment?.startsAt ?? record.date);
				time = formatTime(assessment?.startsAt);
			}

			return {
				id: record.id,
				date,
				time,
				label,
				status: record.status,
				kind: isDaily ? 'daily' : 'session',
			} satisfies StudentAttendanceHistoryItem;
		})
		.sort((left, right) => `${right.date}${right.time}`.localeCompare(`${left.date}${left.time}`));
}

export async function loadStudentAttendanceHistory(
	client: SchoolClient,
	studentId: string,
): Promise<StudentAttendanceHistoryItem[]> {
	const recordsRaw = await client.entities.attendance.list(attendanceForStudents([studentId]));
	if (!recordsRaw?.length) {
		return [];
	}

	const occurrenceIds = uniqueIds(
		recordsRaw.map(record => record.attendanceId).filter((id): id is string => Boolean(id)),
	);
	const lessonSessionIds = uniqueIds(
		recordsRaw.map(record => record.lessonSessionId).filter((id): id is string => Boolean(id)),
	);
	const activitySessionIds = uniqueIds(
		recordsRaw.map(record => record.activitySessionId).filter((id): id is string => Boolean(id)),
	);
	const assessmentIds = uniqueIds(
		recordsRaw.map(record => record.assessmentId).filter((id): id is string => Boolean(id)),
	);

	const [occurrencesRaw, lessonSessionsRaw, activitySessionsRaw, assessmentsRaw] = await Promise.all([
		occurrenceIds.length > 0
			? client.entities.attendances.list(entitiesByIds(occurrenceIds))
			: Promise.resolve([]),
		lessonSessionIds.length > 0
			? client.entities.lessonSessions.list(entitiesByIds(lessonSessionIds))
			: Promise.resolve([]),
		activitySessionIds.length > 0
			? client.entities.activitySessions.list(entitiesByIds(activitySessionIds))
			: Promise.resolve([]),
		assessmentIds.length > 0
			? client.entities.assessments.list(entitiesByIds(assessmentIds))
			: Promise.resolve([]),
	]);

	return mapStudentAttendanceHistory(
		recordsRaw,
		new Map((occurrencesRaw ?? []).map(entry => [entry.id, entry])),
		new Map((lessonSessionsRaw ?? []).map(entry => [entry.id, entry])),
		new Map((activitySessionsRaw ?? []).map(entry => [entry.id, entry])),
		new Map((assessmentsRaw ?? []).map(entry => [entry.id, entry])),
	);
}

export function mapIncidentSanctions(
	sanctionsRaw: StudentDisciplinaryActionRaw[],
	disciplinaryActionsRaw: DisciplinaryActionRaw[],
	studentNames: ReadonlyMap<string, string>,
): IncidentSanctionRow[] {
	const actionById = new Map(disciplinaryActionsRaw.map(action => [action.id, action]));

	return sanctionsRaw
		.map(sanction => ({
			id: sanction.id,
			studentId: sanction.studentId,
			studentName: studentNames.get(sanction.studentId) ?? sanction.studentId,
			actionName: actionById.get(sanction.disciplinaryActionId)?.name ?? sanction.disciplinaryActionId,
			status: sanction.status,
			notes: typeof sanction.notes === 'string' ? sanction.notes : undefined,
		}))
		.sort((left, right) => left.studentName.localeCompare(right.studentName));
}

export async function loadIncidentSanctions(
	client: SchoolClient,
	incidentId: string,
	studentNames: ReadonlyMap<string, string>,
): Promise<IncidentSanctionRow[]> {
	const sanctionsRaw = await client.entities.studentDisciplinaryActions.list(
		disciplinaryActionsForIncident(incidentId),
	);
	if (!sanctionsRaw?.length) {
		return [];
	}

	const actionIds = uniqueIds(sanctionsRaw.map(sanction => sanction.disciplinaryActionId));
	const disciplinaryActionsRaw = actionIds.length > 0
		? await client.entities.disciplinaryActions.list(entitiesByIds(actionIds))
		: [];

	return mapIncidentSanctions(sanctionsRaw, disciplinaryActionsRaw ?? [], studentNames);
}
