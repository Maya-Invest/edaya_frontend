import type { AbsenceRecord, Incident, PedagogicalNote } from '$lib/types/school';
import { recordAssessmentResultMutation } from '$lib/api/mutations/evaluation.mutations';
import { recordIncidentMutation } from '$lib/api/mutations/incident.mutations';
import { runMutation } from '$lib/api/mutations/run-mutation';
import { uploadProfilePhoto, withPhotoCacheBust } from '$lib/api/profile-photo-upload';
import { academicContext } from '$lib/academic/context.svelte';
import { loadClassReportCardResultsData, loadReportCardCatalogData } from '$lib/api/report-cards-data';
import { getBrowserSchoolClient } from '$lib/api/school-client';
import { authSession } from '$lib/auth/session.svelte';
import { dateInputToIso, formatDateInput } from '$lib/date/format';
import { entityVersions } from '$lib/entity-versions.svelte';
import { mapNoteCategory } from '$lib/api/student-360-data';
import type { StudentsPageState } from './students-page.svelte';

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

function studentAverageFromDetail(state: StudentsPageState, studentId: string): number {
	const detail = state.detail;
	if (!detail || detail.studentId !== studentId) {
		return state.findStudent(studentId)?.average ?? 0;
	}

	let weightedSum = 0;
	let totalCoefficient = 0;

	for (const result of detail.assessmentResults) {
		if (result.studentId !== studentId || typeof result.score !== 'number') {
			continue;
		}

		const evaluation = detail.evaluations.find(entry => entry.id === result.assessmentId);
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

function resolveReportCardDefinitionId(state: StudentsPageState, studentId: string): string | undefined {
	const student = state.findStudent(studentId);
	if (!student) {
		return undefined;
	}

	const cls = academicContext.classes.find(entry => entry.id === student.classId);
	if (!cls) {
		return undefined;
	}

	const definitions = state.detail?.reportCardDefinitions ?? [];
	const definition = definitions.find(
		entry =>
			entry.gradeLevelId === cls.gradeLevelId
			&& entry.academicYearId === academicContext.yearId
			&& entry.status === 'published',
	) ?? definitions.find(
		entry => entry.gradeLevelId === cls.gradeLevelId && entry.status === 'published',
	);

	return definition?.id;
}

async function refreshStudentReportCardResults(state: StudentsPageState, studentId: string): Promise<void> {
	const student = state.findStudent(studentId);
	if (!student || !state.detail || state.detail.studentId !== studentId) {
		return;
	}

	const periodId = academicContext.periodId;
	const results = await loadClassReportCardResultsData(
		getBrowserSchoolClient(),
		student.classId,
		periodId,
		state.detail.reportCardDefinitions,
	);
	state.seedDetail(studentId, {
		reportCardResults: results.filter(result => result.studentId === studentId),
	});
}

export async function createStudentOnPage(state: StudentsPageState, input: {
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
	if (!resolvedSchoolId) {
		return null;
	}

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
	}, {
		successMessage: input.successMessage,
		apply: () => {
			entityVersions.bump('students');
		},
	});

	if (!result) {
		return null;
	}

	await state.ensureSelectedStudent(studentId);
	return studentId;
}

export async function updateStudentProfileOnPage(state: StudentsPageState, input: {
	studentId: string;
	firstName: string;
	lastName: string;
	birthDate?: string;
	successMessage?: string;
}): Promise<boolean> {
	const client = getBrowserSchoolClient();
	const previous = state.findStudent(input.studentId);
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
			state.patchStudent(input.studentId, {
				name: nextName,
				initials: studentInitials(input.firstName, input.lastName),
				birthdate: nextBirthdate,
			});
			entityVersions.bump('students');
		},
		rollback: () => {
			if (previous) {
				state.patchStudent(input.studentId, previous);
			}
		},
	});
	return result !== null;
}

export async function updateStudentProfilePhotoOnPage(state: StudentsPageState, input: {
	studentId: string;
	file: File;
	successMessage?: string;
}): Promise<boolean> {
	const resolvedSchoolId = schoolId();
	if (!resolvedSchoolId) {
		return false;
	}

	const previous = state.findStudent(input.studentId)?.photoUrl ?? null;

	const result = await runMutation(async () => {
		const uploaded = await uploadProfilePhoto({
			ownerKind: 'student',
			ownerId: input.studentId,
			file: input.file,
			schoolId: resolvedSchoolId,
		});
		const photoUrl = withPhotoCacheBust(uploaded.photoUrl);
		await getBrowserSchoolClient().commands.updateStudentProfile({
			studentId: input.studentId,
			photoUrl,
		});
		return photoUrl;
	}, {
		successMessage: input.successMessage,
		onSuccess: (photoUrl) => {
			state.patchStudent(input.studentId, { photoUrl });
			entityVersions.bump('students');
		},
		rollback: () => {
			state.patchStudent(input.studentId, { photoUrl: previous });
		},
	});

	return result !== null;
}

export async function transferStudentOnPage(state: StudentsPageState, input: {
	enrollmentId: string;
	studentId: string;
	nextClassGroupId: string;
	successMessage?: string;
}): Promise<boolean> {
	const client = getBrowserSchoolClient();
	const previous = state.findStudent(input.studentId);
	const nextEnrollmentId = `enr-${input.studentId}-${Date.now().toString(36)}`;

	const result = await runMutation(() => client.commands.transferStudent({
		enrollmentId: input.enrollmentId,
		nextEnrollmentId,
		nextClassGroupId: input.nextClassGroupId,
		effectiveAt: new Date().toISOString().slice(0, 10),
	}), {
		successMessage: input.successMessage,
		apply: () => {
			state.patchStudent(input.studentId, {
				classId: input.nextClassGroupId,
				enrollmentId: nextEnrollmentId,
			});
			entityVersions.bump('students');
		},
		rollback: () => {
			if (previous) {
				state.patchStudent(input.studentId, previous);
			}
		},
	});
	return result !== null;
}

export async function linkGuardianToStudentOnPage(state: StudentsPageState, input: {
	guardianId: string;
	studentId: string;
	relationship?: string;
	successMessage?: string;
}): Promise<boolean> {
	const client = getBrowserSchoolClient();
	const id = `gl-${input.guardianId}-${input.studentId}`;
	const previousGuardian = state.detail?.guardians.find(guardian => guardian.id === input.guardianId);
	const previousStudent = state.findStudent(input.studentId);

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
				state.patchDetailGuardian(input.guardianId, {
					studentIds: [...previousGuardian.studentIds, input.studentId],
				});
			}
			if (previousStudent && previousGuardian) {
				state.patchStudent(input.studentId, {
					guardian: previousGuardian.name,
				});
			}
			entityVersions.bump('students');
		},
		rollback: () => {
			if (previousGuardian) {
				state.patchDetailGuardian(input.guardianId, {
					studentIds: previousGuardian.studentIds,
				});
			}
			if (previousStudent) {
				state.patchStudent(input.studentId, {
					guardian: previousStudent.guardian,
				});
			}
		},
	});
	return result !== null;
}

export async function recordStudentAssessmentResultOnPage(state: StudentsPageState, input: {
	studentId: string;
	assessmentId: string;
	score: number;
	successMessage?: string;
}): Promise<boolean> {
	const resultId = `ar-${input.assessmentId}-${input.studentId}`;
	const previous = state.findStudent(input.studentId);
	const previousAverage = previous?.average ?? 0;

	const result = await recordAssessmentResultMutation({
		...input,
		successMessage: input.successMessage,
		apply: () => {
			state.appendDetailAssessmentResult({
				id: resultId,
				studentId: input.studentId,
				assessmentId: input.assessmentId,
				score: input.score,
			});
			state.patchStudent(input.studentId, {
				average: studentAverageFromDetail(state, input.studentId),
			});
			entityVersions.bump('students');
		},
		rollback: () => {
			state.removeDetailAssessmentResult(resultId);
			if (previous) {
				state.patchStudent(input.studentId, { average: previousAverage });
			}
		},
	});
	return result;
}

export async function recordStudentDailyAttendanceOnPage(state: StudentsPageState, input: {
	studentId: string;
	classGroupId: string;
	date: string;
	status: AttendanceStatus;
	successMessage?: string;
}): Promise<boolean> {
	const client = getBrowserSchoolClient();
	const id = `att-${input.studentId}-${input.date}`;
	const previous = state.findStudent(input.studentId);
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
			state.appendDetailAbsence(optimisticAbsence);
			if (previous) {
				state.patchStudent(input.studentId, {
					attendance: Math.max(0, Math.round((previous.attendance - 1) * 10) / 10),
				});
			}
			entityVersions.bump('students');
		},
		rollback: () => {
			state.removeDetailAbsence(id);
			if (previous) {
				state.patchStudent(input.studentId, { attendance: previous.attendance });
			}
		},
	});
	return result !== null;
}

export async function recordStudentIncidentOnPage(state: StudentsPageState, input: {
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
		involvedStudentIds: [input.studentId],
		involvedCount: 1,
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
			state.appendDetailIncident(optimisticIncident);
			entityVersions.bump('students');
		},
		rollback: () => {
			state.removeDetailIncident(incidentId);
		},
	});
	return result !== null;
}

export async function createStudentNoteOnPage(state: StudentsPageState, input: {
	studentId: string;
	title?: string | null;
	category: StudentNoteCategory;
	body: string;
	visibility?: StudentNoteVisibility;
	successMessage?: string;
}): Promise<boolean> {
	const client = getBrowserSchoolClient();
	const id = `note-${input.studentId}-${Date.now().toString(36)}`;
	const now = new Date().toISOString().slice(0, 10);
	const optimisticNote: PedagogicalNote = {
		id,
		studentId: input.studentId,
		date: now,
		authorId: authSession.userProfile?.id ?? '',
		category: mapNoteCategory(input.category, input.title),
		content: input.body.trim(),
	};

	const result = await runMutation(() => client.commands.createStudentNote({
		id,
		studentId: input.studentId,
		title: input.title ?? null,
		category: input.category,
		body: input.body.trim(),
		visibility: input.visibility ?? 'staff',
		createdAt: new Date().toISOString(),
	}), {
		successMessage: input.successMessage,
		apply: () => {
			state.appendDetailNote(optimisticNote);
			entityVersions.bump('students');
		},
		rollback: () => {
			state.removeDetailNote(id);
		},
	});
	return result !== null;
}

export async function updateStudentNoteOnPage(state: StudentsPageState, input: {
	noteId: string;
	studentId: string;
	category: StudentNoteCategory;
	body: string;
	visibility?: StudentNoteVisibility;
	successMessage?: string;
}): Promise<boolean> {
	const client = getBrowserSchoolClient();
	const previous = state.detail?.pedagogicalNotes.find(note => note.id === input.noteId);

	const result = await runMutation(() => client.commands.updateStudentNote({
		noteId: input.noteId,
		category: input.category,
		body: input.body.trim(),
		visibility: input.visibility ?? 'staff',
		updatedAt: new Date().toISOString(),
	}), {
		successMessage: input.successMessage,
		apply: () => {
			state.patchDetailNote(input.noteId, {
				category: mapNoteCategory(input.category),
				content: input.body.trim(),
			});
			entityVersions.bump('students');
		},
		rollback: () => {
			if (previous) {
				state.patchDetailNote(input.noteId, previous);
			}
		},
	});
	return result !== null;
}

export async function generateReportCardOnPage(state: StudentsPageState, studentId: string): Promise<boolean> {
	const periodId = academicContext.periodId;
	const definitionId = resolveReportCardDefinitionId(state, studentId);
	if (!definitionId) {
		return false;
	}

	const client = getBrowserSchoolClient();
	const id = `rcr-${studentId}-${periodId}`;

	const result = await runMutation(async () => {
		await client.commands.generateReportCardResult({
			id,
			studentId,
			periodId,
			reportCardDefinitionId: definitionId,
			generatedAt: new Date().toISOString(),
		});
		return true;
	}, {
		errorMessage: 'Impossible de générer le bulletin.',
		onSuccess: async () => {
			await refreshStudentReportCardResults(state, studentId);
			entityVersions.bump('students');
		},
	});
	return result !== null;
}

export async function publishReportCardOnPage(state: StudentsPageState, input: {
	resultId: string;
	studentId: string;
	periodId: string;
	definitionId?: string;
}): Promise<boolean> {
	const client = getBrowserSchoolClient();
	const existing = state.detail?.reportCardResults.find(r => r.id === input.resultId);
	const resolvedDefinitionId = input.definitionId ?? existing?.definitionId;

	const result = await runMutation(() => client.commands.publishReportCardResult({
		id: input.resultId,
		studentId: input.studentId,
		periodId: input.periodId,
		reportCardDefinitionId: resolvedDefinitionId,
		publishedAt: new Date().toISOString(),
	}), {
		onSuccess: async () => {
			await refreshStudentReportCardResults(state, input.studentId);
			entityVersions.bump('students');
		},
	});
	return result !== null;
}

export async function loadReportCardCatalogIntoDetail(state: StudentsPageState, studentId: string): Promise<void> {
	const catalog = await loadReportCardCatalogData(getBrowserSchoolClient());
	state.seedDetail(studentId, {
		gradeScales: catalog.gradeScales,
		reportCardDefinitions: catalog.definitions,
	});
}
