import type { components } from '$lib/api/schema';
import { runMutation } from '$lib/api/mutations/run-mutation';
import { getBrowserSchoolClient } from '$lib/api/school-client';
import { authSession } from '$lib/auth/session.svelte';

type HealthProfile = components['schemas']['StudentHealthProfile'];
type StudentStatus = components['schemas']['UpdateStudentStatusCommand']['status'];

export async function upsertStudentHealthProfileMutation(input: {
	id?: string;
	studentId: string;
	allergies?: string | null;
	medicalConditions?: string | null;
	medications?: string | null;
	clinicalNotes?: string | null;
	bloodType?: string | null;
	lastVisit?: string | null;
	emergencyProtocols?: string | null;
	successMessage?: string;
}): Promise<HealthProfile | null> {
	const client = getBrowserSchoolClient();
	const id = input.id ?? `shp-${input.studentId}`;
	// Omit updatedAt — sending it without createdAt fails server validation.
	const parsedLastVisit = input.lastVisit ? new Date(input.lastVisit) : null;
	const lastVisit = parsedLastVisit && !Number.isNaN(parsedLastVisit.getTime())
		? parsedLastVisit.toISOString()
		: null;

	return runMutation(
		() => client.commands.upsertStudentHealthProfile({
			id,
			studentId: input.studentId,
			allergies: input.allergies ?? null,
			medicalConditions: input.medicalConditions ?? null,
			medications: input.medications ?? null,
			clinicalNotes: input.clinicalNotes ?? null,
			bloodType: input.bloodType ?? null,
			lastVisit,
			emergencyProtocols: input.emergencyProtocols ?? null,
		}),
		{
			successMessage: input.successMessage,
			versionKeys: ['students'],
		},
	);
}

export async function updateStudentStatusMutation(input: {
	studentId: string;
	status: StudentStatus;
	successMessage?: string;
}): Promise<boolean> {
	const client = getBrowserSchoolClient();
	const result = await runMutation(
		() => client.commands.updateStudentStatus({
			studentId: input.studentId,
			status: input.status,
		}),
		{
			successMessage: input.successMessage,
			versionKeys: ['students'],
		},
	);
	return result !== null;
}

export async function promoteStudentMutation(input: {
	enrollmentId: string;
	nextEnrollmentId?: string;
	nextClassGroupId: string;
	effectiveAt?: string | null;
	notes?: string;
	successMessage?: string;
}): Promise<boolean> {
	const client = getBrowserSchoolClient();
	const nextEnrollmentId = input.nextEnrollmentId ?? `enr-${Date.now().toString(36)}`;
	const result = await runMutation(
		() => client.commands.promoteStudent({
			enrollmentId: input.enrollmentId,
			nextEnrollmentId,
			nextClassGroupId: input.nextClassGroupId,
			effectiveAt: input.effectiveAt ?? new Date().toISOString(),
			notes: input.notes,
		}),
		{
			successMessage: input.successMessage,
			versionKeys: ['students'],
		},
	);
	return result !== null;
}

export async function graduateStudentMutation(input: {
	enrollmentId: string;
	effectiveAt?: string | null;
	notes?: string;
	successMessage?: string;
}): Promise<boolean> {
	const client = getBrowserSchoolClient();
	const result = await runMutation(
		() => client.commands.graduateStudent({
			enrollmentId: input.enrollmentId,
			effectiveAt: input.effectiveAt ?? new Date().toISOString(),
			notes: input.notes,
		}),
		{
			successMessage: input.successMessage,
			versionKeys: ['students'],
		},
	);
	return result !== null;
}

export async function closeEnrollmentMutation(input: {
	enrollmentId: string;
	endReason: 'completed' | 'transferred' | 'withdrawn';
	endedAt?: string | null;
	successMessage?: string;
}): Promise<boolean> {
	const client = getBrowserSchoolClient();
	const result = await runMutation(
		() => client.commands.closeEnrollment({
			enrollmentId: input.enrollmentId,
			endReason: input.endReason,
			endedAt: input.endedAt ?? new Date().toISOString(),
		}),
		{
			successMessage: input.successMessage,
			versionKeys: ['students'],
		},
	);
	return result !== null;
}

export async function writeHomeroomReportCommentMutation(input: {
	resultId: string;
	teacherComment: string;
	successMessage?: string;
}): Promise<boolean> {
	const client = getBrowserSchoolClient();
	const result = await runMutation(
		() => client.commands.writeHomeroomReportComment({
			id: input.resultId,
			teacherComment: input.teacherComment.trim(),
		}),
		{
			successMessage: input.successMessage,
			versionKeys: ['reportCards'],
		},
	);
	return result !== null;
}

/** Ensures school context is present for health writes (actor headers already set). */
export function healthWriteSchoolId(): string {
	return authSession.schoolId ?? '';
}
