import { recordAssessmentResultMutation } from '$lib/api/mutations/evaluation.mutations';
import { recordIncidentMutation } from '$lib/api/mutations/incident.mutations';
import { runMutation } from '$lib/api/mutations/run-mutation';
import { getBrowserSchoolClient } from '$lib/api/school-client';
import { authSession } from '$lib/auth/session.svelte';
import { dateInputToIso } from '$lib/date/format';

type StudentNoteCategory = 'behavior' | 'work' | 'progress' | 'encouragement';
type StudentNoteVisibility = 'staff' | 'admin_only' | 'guardian_visible';
type AttendanceStatus = 'absent' | 'late';
type IncidentKind = 'positive' | 'minor_infraction' | 'major_infraction' | 'emergency';

function schoolId(): string {
	return authSession.schoolId ?? '';
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
	}, {
		successMessage: input.successMessage,
		versionKeys: ['students'],
	});

	return result ? studentId : null;
}

export async function recordStudentAssessmentResultMutation(input: {
	studentId: string;
	assessmentId: string;
	score: number;
	successMessage?: string;
}): Promise<boolean> {
	return recordAssessmentResultMutation(input);
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

	const result = await runMutation(() => client.commands.recordDailyAttendance({
		id,
		studentId: input.studentId,
		classGroupId: input.classGroupId,
		date: input.date,
		status: input.status,
		createdAt: new Date().toISOString(),
	}), {
		successMessage: input.successMessage,
		versionKeys: ['attendance'],
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

	const result = await recordIncidentMutation({
		...input,
		incidentId,
		successMessage: input.successMessage,
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
		versionKeys: ['students', 'guardians'],
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
	}), {
		successMessage: input.successMessage,
		versionKeys: ['students'],
	});
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
	}), {
		successMessage: input.successMessage,
		versionKeys: ['students'],
	});
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

	const result = await runMutation(() => client.commands.updateStudentProfile({
		studentId: input.studentId,
		firstName: input.firstName.trim(),
		lastName: input.lastName.trim(),
		birthDate: dateInputToIso(input.birthDate ?? '') ?? null,
	}), {
		successMessage: input.successMessage,
		versionKeys: ['students'],
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
	const nextEnrollmentId = `enr-${input.studentId}-${Date.now().toString(36)}`;

	const result = await runMutation(() => client.commands.transferStudent({
		enrollmentId: input.enrollmentId,
		nextEnrollmentId,
		nextClassGroupId: input.nextClassGroupId,
		effectiveAt: new Date().toISOString().slice(0, 10),
	}), {
		successMessage: input.successMessage,
		versionKeys: ['students'],
	});
	return result !== null;
}
