import type { getBrowserSchoolClient } from '$lib/api/school-client';

type SchoolClient = ReturnType<typeof getBrowserSchoolClient>;

function buildContactMethods(email: string, phone: string) {
	return [
		email
			? {
					type: 'email' as const,
					value: email,
					label: 'Email',
					isPrimary: true,
					allowsNotifications: true,
				}
			: null,
		phone
			? {
					type: 'phone' as const,
					value: phone,
					label: 'Téléphone',
					isPrimary: !email,
					allowsNotifications: true,
				}
			: null,
	].filter((method): method is NonNullable<typeof method> => method !== null);
}

export interface RegisterAndLinkGuardianInput {
	schoolId: string;
	guardianId: string;
	linkId: string;
	studentId: string;
	firstName: string;
	lastName: string;
	email?: string;
	phone?: string;
	sendAccountInvitation?: boolean;
	createdAt?: string;
}

export async function registerAndLinkGuardian(
	client: SchoolClient,
	input: RegisterAndLinkGuardianInput,
): Promise<void> {
	const now = input.createdAt ?? new Date().toISOString();
	const email = input.email?.trim() ?? '';
	const phone = input.phone?.trim() ?? '';

	await client.commands.registerGuardian({
		id: input.guardianId,
		schoolId: input.schoolId,
		firstName: input.firstName.trim(),
		lastName: input.lastName.trim(),
		email: email || null,
		phone: phone || null,
		contactMethods: buildContactMethods(email, phone),
		hasAccess: true,
		sendAccountInvitation: input.sendAccountInvitation ?? false,
		createdAt: now,
	});

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
