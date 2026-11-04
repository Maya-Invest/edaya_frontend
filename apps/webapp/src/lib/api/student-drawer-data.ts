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
	enrollmentsForStudents,
	listAllEntityPages,
	listAllEntityPagesByIds,
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
			enrolledAt: formatDate(enrollment.enrolledAt),
			endedAt: enrollment.endedAt ? formatDate(enrollment.endedAt) : undefined,
			endReason: enrollment.endReason ?? null,
			progressionDecision: enrollment.progressionDecision,
			progressionDecidedAt: enrollment.progressionDecidedAt ? formatDate(enrollment.progressionDecidedAt) : undefined,
			progressionDecidedBy: enrollment.progressionDecidedBy,
			progressionNotes: enrollment.progressionNotes,
			previousEnrollmentId: enrollment.previousEnrollmentId,
			closedBy: enrollment.closedBy,
			enrollmentIndex: enrollment.enrollmentIndex,
		}))
		.sort((left, right) => right.enrolledAt.localeCompare(left.enrolledAt));
}

export async function loadStudentEnrollmentHistory(
	client: SchoolClient,
	studentId: string,
): Promise<StudentEnrollmentHistoryItem[]> {
	const enrollmentsRaw = await listAllEntityPages(
		query => client.entities.enrollments.list(query),
		{ baseQuery: enrollmentsForStudents([studentId]) },
	);
	const classIds = uniqueIds(enrollmentsRaw.map(enrollment => enrollment.classGroupId));
	const classGroupsRaw = await listAllEntityPagesByIds(
		query => client.entities.classGroups.list(query),
		classIds,
	);
	const classNames = new Map(classGroupsRaw.map(entry => [entry.id, entry.name]));
	return mapStudentEnrollmentHistory(enrollmentsRaw, classNames);
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
	const resultsRaw = await listAllEntityPages(
		query => client.entities.assessmentResults.list(query),
		{ baseQuery: assessmentResultsForStudents([studentId]) },
	);
	const assessmentIds = uniqueIds(resultsRaw.map(result => result.assessmentId));
	if (assessmentIds.length === 0) {
		return [];
	}

	const assessmentsRaw = await listAllEntityPagesByIds(
		query => client.entities.assessments.list(query),
		assessmentIds,
	);
	const classSubjectIds = uniqueIds(assessmentsRaw.map(assessment => assessment.classSubjectId));
	const classSubjectsRaw = await listAllEntityPagesByIds(
		query => client.entities.classSubjects.list(query),
		classSubjectIds,
	);
	const subjectIds = uniqueIds(classSubjectsRaw.map(entry => entry.subjectId));
	const subjectsRaw = await listAllEntityPagesByIds(
		query => client.entities.subjects.list(query),
		subjectIds,
	);

	return mapStudentGradeRows(
		resultsRaw,
		assessmentsRaw,
		subjectsRaw,
		classSubjectsRaw,
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
	const recordsRaw = await listAllEntityPages(
		query => client.entities.attendance.list(query),
		{ baseQuery: attendanceForStudents([studentId]) },
	);
	if (!recordsRaw.length) {
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
		listAllEntityPagesByIds(query => client.entities.attendances.list(query), occurrenceIds),
		listAllEntityPagesByIds(query => client.entities.lessonSessions.list(query), lessonSessionIds),
		listAllEntityPagesByIds(query => client.entities.activitySessions.list(query), activitySessionIds),
		listAllEntityPagesByIds(query => client.entities.assessments.list(query), assessmentIds),
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
	const sanctionsRaw = await listAllEntityPages(
		query => client.entities.studentDisciplinaryActions.list(query),
		{ baseQuery: disciplinaryActionsForIncident(incidentId) },
	);
	if (!sanctionsRaw.length) {
		return [];
	}

	const actionIds = uniqueIds(sanctionsRaw.map(sanction => sanction.disciplinaryActionId));
	const disciplinaryActionsRaw = await listAllEntityPagesByIds(
		query => client.entities.disciplinaryActions.list(query),
		actionIds,
	);

	return mapIncidentSanctions(sanctionsRaw, disciplinaryActionsRaw, studentNames);
}
