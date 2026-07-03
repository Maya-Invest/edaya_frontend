import type { AbsenceRecord, Incident, Student } from '$lib/types/school';
import { recordAssessmentResultMutation } from '$lib/api/mutations/evaluation.mutations';
import { recordIncidentMutation } from '$lib/api/mutations/incident.mutations';
import { runMutation } from '$lib/api/mutations/run-mutation';
import { getBrowserSchoolClient } from '$lib/api/school-client';
import { authSession } from '$lib/auth/session.svelte';
import { dateInputToIso, formatDateInput } from '$lib/date/format';
import { detailDataContext } from '$lib/detail-data/context.svelte';

type StudentNoteCategory = 'behavior' | 'work' | 'progress' | 'encouragement';
type StudentNoteVisibility = 'staff' | 'admin_only' | 'guardian_visible';
type AttendanceStatus = 'absent' | 'late';
type IncidentKind = 'positive' | 'minor_infraction' | 'major_infraction' | 'emergency';

function schoolId(): string {
	return authSession.schoolId ?? '';
}

function studentInitials(firstName: string, lastName: string): string {
	return `${firstName.trim()[0] ?? ''}${lastName.trim()[0] ?? ''}`;
}

function studentSnapshot(studentId: string): Student | undefined {
	return detailDataContext.students.find(student => student.id === studentId);
}

function studentAverageFromStore(studentId: string): number {
	let weightedSum = 0;
	let totalCoefficient = 0;

	for (const result of detailDataContext.assessmentResults) {
		if (result.studentId !== studentId || typeof result.score !== 'number') {
			continue;
		}

		const evaluation = detailDataContext.evaluations.find(entry => entry.id === result.assessmentId);
		if (!evaluation || evaluation.outOf <= 0) {
			continue;
		}

		const normalized = (result.score / evaluation.outOf) * 20;
		weightedSum += normalized * evaluation.coefficient;
		totalCoefficient += evaluation.coefficient;
	}

	if (totalCoefficient === 0) {
		return 0;
	}

	return Math.round((weightedSum / totalCoefficient) * 10) / 10;
}

function incidentCategoryFromKind(kind: IncidentKind): Incident['category'] {
	switch (kind) {
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

function incidentSeverityFromKind(kind: IncidentKind): Incident['severity'] {
	switch (kind) {
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

export async function createStudentMutation(input: {
	firstName: string;
	lastName: string;
	classGroupId: string;
	birthDate?: string;
	sendAccountInvitation?: boolean;
	inviteEmail?: string;
	successMessage?: string;
}): Promise<string | null> {
	const client = getBrowserSchoolClient();
	const resolvedSchoolId = schoolId();
	if (!resolvedSchoolId)
		return null;

	const studentId = `stu-${Date.now().toString(36)}`;
	const enrollmentId = `enr-${studentId}`;
	const now = new Date().toISOString();
	const birthDate = dateInputToIso(input.birthDate ?? '');

	const result = await runMutation(async () => {
		await client.commands.registerStudent({
			id: studentId,
			schoolId: resolvedSchoolId,
			firstName: input.firstName.trim(),
			lastName: input.lastName.trim(),
			birthDate,
			sendAccountInvitation: input.sendAccountInvitation ?? true,
			...(input.inviteEmail?.trim() ? { inviteEmail: input.inviteEmail.trim() } : {}),
			createdAt: now,
		});
		return client.commands.enrollStudent({
			id: enrollmentId,
			studentId,
			classGroupId: input.classGroupId,
			createdAt: now,
		});
	}, { successMessage: input.successMessage });

	return result ? studentId : null;
}

export async function recordStudentAssessmentResultMutation(input: {
	studentId: string;
	assessmentId: string;
	score: number;
	successMessage?: string;
}): Promise<boolean> {
	const resultId = `ar-${input.assessmentId}-${input.studentId}`;
	const previous = studentSnapshot(input.studentId);
	const previousAverage = previous?.average ?? 0;

	const result = await recordAssessmentResultMutation({
		...input,
		successMessage: input.successMessage,
		apply: () => {
			detailDataContext.appendAssessmentResult({
				id: resultId,
				studentId: input.studentId,
				assessmentId: input.assessmentId,
				score: input.score,
			});
			detailDataContext.patchStudent(input.studentId, {
				average: studentAverageFromStore(input.studentId),
			});
		},
		rollback: () => {
			detailDataContext.removeAssessmentResult(resultId);
			if (previous) {
				detailDataContext.patchStudent(input.studentId, { average: previousAverage });
			}
		},
	});
	return result;
}

export async function recordStudentDailyAttendanceMutation(input: {
	studentId: string;
	classGroupId: string;
	date: string;
	status: AttendanceStatus;
	successMessage?: string;
}): Promise<boolean> {
	const client = getBrowserSchoolClient();
	const id = `att-${input.studentId}-${input.date}`;
	const previous = studentSnapshot(input.studentId);
	const optimisticAbsence: AbsenceRecord = {
		id,
		studentId: input.studentId,
		date: input.date,
		time: '—',
		subject: '—',
		eventType: 'Cours',
		reason: input.status === 'late' ? 'Retard' : 'Absence',
	};

	const result = await runMutation(() => client.commands.recordDailyAttendance({
		id,
		studentId: input.studentId,
		classGroupId: input.classGroupId,
		date: input.date,
		status: input.status,
		createdAt: new Date().toISOString(),
	}), {
		successMessage: input.successMessage,
		apply: () => {
			detailDataContext.appendAbsence(optimisticAbsence);
			if (previous) {
				detailDataContext.patchStudent(input.studentId, {
					attendance: Math.max(0, Math.round((previous.attendance - 1) * 10) / 10),
				});
			}
		},
		rollback: () => {
			detailDataContext.removeAbsence(id);
			if (previous) {
				detailDataContext.patchStudent(input.studentId, { attendance: previous.attendance });
			}
		},
	});
	return result !== null;
}

export async function recordStudentIncidentMutation(input: {
	schoolId: string;
	studentId: string;
	classGroupId?: string;
	title: string;
	description: string;
	kind: IncidentKind;
	successMessage?: string;
}): Promise<boolean> {
	const incidentId = `inc-${input.studentId}-${Date.now().toString(36)}`;
	const optimisticIncident: Incident = {
		id: incidentId,
		studentId: input.studentId,
		date: new Date().toISOString().slice(0, 10),
		category: incidentCategoryFromKind(input.kind),
		severity: incidentSeverityFromKind(input.kind),
		summary: input.title.trim(),
		status: 'open',
	};

	const result = await recordIncidentMutation({
		...input,
		incidentId,
		successMessage: input.successMessage,
		apply: () => {
			detailDataContext.appendIncident(optimisticIncident);
		},
		rollback: () => {
			detailDataContext.removeIncident(incidentId);
		},
	});
	return result !== null;
}

export async function linkGuardianToStudentMutation(input: {
	guardianId: string;
	studentId: string;
	relationship?: string;
	successMessage?: string;
}): Promise<boolean> {
	const client = getBrowserSchoolClient();
	const id = `gl-${input.guardianId}-${input.studentId}`;
	const previousGuardian = detailDataContext.guardians.find(guardian => guardian.id === input.guardianId);
	const previousStudent = studentSnapshot(input.studentId);

	const result = await runMutation(() => client.commands.linkGuardianToStudent({
		id,
		guardianId: input.guardianId,
		studentId: input.studentId,
		relationship: input.relationship ?? 'parent',
		isPrimary: false,
		isBillingContact: false,
		legalGuardian: false,
		canPickup: false,
		emergencyContactPriority: null,
		receivesAcademicReports: true,
		receivesAttendanceAlerts: true,
		contactRestrictions: null,
		notes: null,
		createdAt: new Date().toISOString(),
	}), {
		successMessage: input.successMessage,
		apply: () => {
			if (previousGuardian && !previousGuardian.studentIds.includes(input.studentId)) {
				detailDataContext.patchGuardian(input.guardianId, {
					studentIds: [...previousGuardian.studentIds, input.studentId],
				});
			}
			if (previousStudent && previousGuardian) {
				detailDataContext.patchStudent(input.studentId, {
					guardian: previousGuardian.name,
				});
			}
		},
		rollback: () => {
			if (previousGuardian) {
				detailDataContext.patchGuardian(input.guardianId, {
					studentIds: previousGuardian.studentIds,
				});
			}
			if (previousStudent) {
				detailDataContext.patchStudent(input.studentId, {
					guardian: previousStudent.guardian,
				});
			}
		},
	});
	return result !== null;
}

export async function createStudentNoteMutation(input: {
	studentId: string;
	title?: string | null;
	category: StudentNoteCategory;
	body: string;
	visibility?: StudentNoteVisibility;
	successMessage?: string;
}): Promise<boolean> {
	const client = getBrowserSchoolClient();
	const id = `note-${input.studentId}-${Date.now().toString(36)}`;
	const result = await runMutation(() => client.commands.createStudentNote({
		id,
		studentId: input.studentId,
		title: input.title ?? null,
		category: input.category,
		body: input.body.trim(),
		visibility: input.visibility ?? 'staff',
		createdAt: new Date().toISOString(),
	}), { successMessage: input.successMessage });
	return result !== null;
}

export async function updateStudentNoteMutation(input: {
	noteId: string;
	category: StudentNoteCategory;
	body: string;
	visibility?: StudentNoteVisibility;
	successMessage?: string;
}): Promise<boolean> {
	const client = getBrowserSchoolClient();
	const result = await runMutation(() => client.commands.updateStudentNote({
		noteId: input.noteId,
		category: input.category,
		body: input.body.trim(),
		visibility: input.visibility ?? 'staff',
		updatedAt: new Date().toISOString(),
	}), { successMessage: input.successMessage });
	return result !== null;
}

export async function updateStudentProfileMutation(input: {
	studentId: string;
	firstName: string;
	lastName: string;
	birthDate?: string;
	successMessage?: string;
}): Promise<boolean> {
	const client = getBrowserSchoolClient();
	const previous = studentSnapshot(input.studentId);
	const nextName = `${input.firstName.trim()} ${input.lastName.trim()}`;
	const nextBirthdate = formatDateInput(dateInputToIso(input.birthDate ?? '') ?? previous?.birthdate ?? '');

	const result = await runMutation(() => client.commands.updateStudentProfile({
		studentId: input.studentId,
		firstName: input.firstName.trim(),
		lastName: input.lastName.trim(),
		birthDate: dateInputToIso(input.birthDate ?? '') ?? null,
	}), {
		successMessage: input.successMessage,
		apply: () => {
			detailDataContext.patchStudent(input.studentId, {
				name: nextName,
				initials: studentInitials(input.firstName, input.lastName),
				birthdate: nextBirthdate,
			});
		},
		rollback: () => {
			if (previous) {
				detailDataContext.patchStudent(input.studentId, previous);
			}
		},
	});
	return result !== null;
}

export async function transferStudentMutation(input: {
	enrollmentId: string;
	studentId: string;
	nextClassGroupId: string;
	successMessage?: string;
}): Promise<boolean> {
	const client = getBrowserSchoolClient();
	const previous = studentSnapshot(input.studentId);
	const nextEnrollmentId = `enr-${input.studentId}-${Date.now().toString(36)}`;

	const result = await runMutation(() => client.commands.transferStudent({
		enrollmentId: input.enrollmentId,
		nextEnrollmentId,
		nextClassGroupId: input.nextClassGroupId,
		effectiveAt: new Date().toISOString().slice(0, 10),
	}), {
		successMessage: input.successMessage,
		apply: () => {
			detailDataContext.patchStudent(input.studentId, {
				classId: input.nextClassGroupId,
				enrollmentId: nextEnrollmentId,
			});
		},
		rollback: () => {
			if (previous) {
				detailDataContext.patchStudent(input.studentId, previous);
			}
		},
	});
	return result !== null;
}
