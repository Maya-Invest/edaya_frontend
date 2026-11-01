import type { getBrowserSchoolClient } from '$lib/api/school-client';

type SchoolClient = ReturnType<typeof getBrowserSchoolClient>;

export interface RegisterGuardianInput {
	schoolId: string;
	guardianId: string;
	firstName: string;
	lastName: string;
	code?: string;
	email?: string;
	phone?: string;
	alternativePhone?: string;
	emailNotificationsEnabled?: boolean;
	smsNotificationsEnabled?: boolean;
	pushNotificationsEnabled?: boolean;
	sendAccountInvitation?: boolean;
	createdAt?: string;
}

export interface LinkGuardianToStudentInput {
	linkId: string;
	guardianId: string;
	studentId: string;
	createdAt?: string;
}

export interface RegisterAndLinkGuardianInput extends RegisterGuardianInput, LinkGuardianToStudentInput {}

export async function registerGuardian(
	client: SchoolClient,
	input: RegisterGuardianInput,
): Promise<void> {
	const now = input.createdAt ?? new Date().toISOString();
	const email = input.email?.trim() ?? '';
	const phone = input.phone?.trim() ?? '';

	const code = input.code?.trim() || undefined;
	await client.commands.registerGuardian({
		id: input.guardianId,
		schoolId: input.schoolId,
		firstName: input.firstName.trim(),
		lastName: input.lastName.trim(),
		...(code ? { code } : {}),
		email: email || null,
		phone: phone || null,
		alternativePhone: input.alternativePhone,
		emailNotificationsEnabled: input.emailNotificationsEnabled,
		smsNotificationsEnabled: input.smsNotificationsEnabled,
		pushNotificationsEnabled: input.pushNotificationsEnabled,
		hasAccess: true,
		sendAccountInvitation: input.sendAccountInvitation ?? false,
		createdAt: now,
	});
}

export async function linkGuardianToStudent(
	client: SchoolClient,
	input: LinkGuardianToStudentInput,
): Promise<void> {
	const now = input.createdAt ?? new Date().toISOString();

	await client.commands.linkGuardianToStudent({
		id: input.linkId,
		guardianId: input.guardianId,
		studentId: input.studentId,
		relationship: 'parent',
		isPrimary: false,
		isBillingContact: false,
		legalGuardian: false,
		canPickup: false,
		emergencyContactPriority: null,
		receivesAcademicReports: true,
		receivesAttendanceAlerts: true,
		contactRestrictions: null,
		notes: null,
		createdAt: now,
	});
}

export async function registerAndLinkGuardian(
	client: SchoolClient,
	input: RegisterAndLinkGuardianInput,
): Promise<void> {
	await registerGuardian(client, input);
	await linkGuardianToStudent(client, input);
}

export function createGuardianImportIds(
	index: number,
	studentId: string,
	seed = Date.now().toString(36),
): {
	guardianId: string;
	linkId: string;
} {
	const guardianId = `grd-${seed}-${index}`;
	return {
		guardianId,
		linkId: `gl-${guardianId}-${studentId}`,
	};
}

export function createGuardianStudentLinkId(guardianId: string, studentId: string): string {
	return `gl-${guardianId}-${studentId}`;
}
