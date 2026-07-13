import type { components } from '$lib/api/schema';
import type { getBrowserSchoolClient } from '$lib/api/school-client';
import { dateInputToIso } from '$lib/date/format';

type SchoolClient = ReturnType<typeof getBrowserSchoolClient>;

export interface RegisterAndEnrollStudentInput {
	schoolId: string;
	studentId: string;
	enrollmentId: string;
	firstName: string;
	lastName: string;
	classGroupId: string;
	birthDate?: string;
	matricule?: string;
	sendAccountInvitation?: boolean;
	inviteEmail?: string;
	createdAt?: string;
}

export async function registerAndEnrollStudent(
	client: SchoolClient,
	input: RegisterAndEnrollStudentInput,
): Promise<void> {
	const now = input.createdAt ?? new Date().toISOString();
	const birthDate = dateInputToIso(input.birthDate ?? '');

	await client.commands.registerStudent({
		id: input.studentId,
		schoolId: input.schoolId,
		firstName: input.firstName.trim(),
		lastName: input.lastName.trim(),
		birthDate,
		sendAccountInvitation: input.sendAccountInvitation ?? false,
		...(input.inviteEmail?.trim() ? { inviteEmail: input.inviteEmail.trim() } : {}),
		createdAt: now,
	} satisfies components['schemas']['RegisterStudentCommand']);

	await client.commands.enrollStudent({
		id: input.enrollmentId,
		studentId: input.studentId,
		classGroupId: input.classGroupId,
		createdAt: now,
	} satisfies components['schemas']['EnrollStudentCommand']);

	const matricule = input.matricule?.trim();
	if (matricule) {
		await client.commands.updateStudentProfile({
			studentId: input.studentId,
			firstName: input.firstName.trim(),
			lastName: input.lastName.trim(),
			birthDate: birthDate ?? null,
			matricule,
		} satisfies components['schemas']['UpdateStudentProfileCommand']);
	}
}

export function createStudentImportIds(index: number, seed = Date.now().toString(36)): {
	studentId: string;
	enrollmentId: string;
} {
	const studentId = `stu-${seed}-${index}`;
	return {
		studentId,
		enrollmentId: `enr-${studentId}`,
	};
}
