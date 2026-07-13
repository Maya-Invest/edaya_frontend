import type { components } from '$lib/api/schema';
import type { getBrowserSchoolClient } from '$lib/api/school-client';

type SchoolClient = ReturnType<typeof getBrowserSchoolClient>;

export interface RegisterStaffMemberInput {
	schoolId: string;
	staffId: string;
	firstName: string;
	lastName: string;
	email?: string;
	sendAccountInvitation?: boolean;
	createdAt?: string;
}

export async function registerStaffMember(
	client: SchoolClient,
	input: RegisterStaffMemberInput,
): Promise<void> {
	const now = input.createdAt ?? new Date().toISOString();
	const email = input.email?.trim() ?? '';

	await client.commands.registerStaffMember({
		id: input.staffId,
		schoolId: input.schoolId,
		firstName: input.firstName.trim(),
		lastName: input.lastName.trim(),
		email: email || null,
		accountKind: 'human',
		isActive: true,
		serviceElevated: false,
		sendAccountInvitation: input.sendAccountInvitation ?? false,
		createdAt: now,
	} satisfies components['schemas']['RegisterStaffMemberCommand']);
}

export function createStaffImportIds(index: number, seed = Date.now().toString(36)): { staffId: string } {
	return {
		staffId: `stf-${seed}-${index}`,
	};
}
