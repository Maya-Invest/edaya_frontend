import { academicContext } from '$lib/academic/context.svelte';
import { runMutation } from '$lib/api/mutations/run-mutation';
import { getBrowserSchoolClient } from '$lib/api/school-client';
import { authSession } from '$lib/auth/session.svelte';

function schoolId(): string {
	return authSession.schoolId ?? academicContext.schools[0]?.id ?? 'sch-edaya-central';
}

export async function registerStaffMemberMutation(input: {
	firstName: string;
	lastName: string;
	email?: string;
	sendAccountInvitation?: boolean;
	successMessage?: string;
}): Promise<string | null> {
	const client = getBrowserSchoolClient();
	const id = `stf-${Date.now().toString(36)}`;
	const email = input.email?.trim() ?? '';

	const result = await runMutation(() => client.commands.registerStaffMember({
		id,
		schoolId: schoolId(),
		firstName: input.firstName.trim(),
		lastName: input.lastName.trim(),
		email: email || null,
		accountKind: 'human',
		isActive: true,
		serviceElevated: false,
		sendAccountInvitation: input.sendAccountInvitation ?? true,
		createdAt: new Date().toISOString(),
	}), {
		successMessage: input.successMessage,
		versionKeys: ['staff'],
	});
	return result ? id : null;
}

export async function updateStaffMemberStatusMutation(input: {
	staffId: string;
	isActive: boolean;
	successMessage?: string;
}): Promise<boolean> {
	const client = getBrowserSchoolClient();

	const result = await runMutation(() => client.commands.updateStaffMemberStatus({
		staffId: input.staffId,
		isActive: input.isActive,
	}), {
		successMessage: input.successMessage,
		versionKeys: ['staff'],
	});
	return result !== null;
}

export async function updateStaffMemberProfileMutation(input: {
	staffId: string;
	firstName: string;
	lastName: string;
	email?: string;
	successMessage?: string;
}): Promise<boolean> {
	const client = getBrowserSchoolClient();
	const email = input.email?.trim() ?? '';

	const result = await runMutation(() => client.commands.updateStaffMemberProfile({
		staffId: input.staffId,
		firstName: input.firstName.trim(),
		lastName: input.lastName.trim(),
		email: email || null,
	}), {
		successMessage: input.successMessage,
		versionKeys: ['staff'],
	});
	return result !== null;
}
