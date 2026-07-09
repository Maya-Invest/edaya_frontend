import type { StaffMember } from '$lib/types/school';
import { academicContext } from '$lib/academic/context.svelte';
import { runMutation } from '$lib/api/mutations/run-mutation';
import { getBrowserSchoolClient } from '$lib/api/school-client';
import { authSession } from '$lib/auth/session.svelte';
import { detailDataContext } from '$lib/detail-data/context.svelte';

function schoolId(): string {
	return authSession.schoolId ?? academicContext.schools[0]?.id ?? 'sch-edaya-central';
}

function staffInitials(firstName: string, lastName: string): string {
	return `${firstName.trim()[0] ?? ''}${lastName.trim()[0] ?? ''}`;
}

function staffSnapshot(staffId: string): StaffMember | undefined {
	return detailDataContext.staff.find(member => member.id === staffId);
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
	const optimistic: StaffMember = {
		id,
		name: `${input.firstName.trim()} ${input.lastName.trim()}`,
		initials: staffInitials(input.firstName, input.lastName),
		role: 'professeur',
		department: '—',
		email,
		classes: [],
		isActive: true,
	};

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
		apply: () => {
			detailDataContext.seedStaff([optimistic]);
		},
		rollback: () => {
			detailDataContext.removeStaff(id);
		},
	});
	return result ? id : null;
}

export async function updateStaffMemberStatusMutation(input: {
	staffId: string;
	isActive: boolean;
	successMessage?: string;
}): Promise<boolean> {
	const client = getBrowserSchoolClient();
	const previous = staffSnapshot(input.staffId);

	const result = await runMutation(() => client.commands.updateStaffMemberStatus({
		staffId: input.staffId,
		isActive: input.isActive,
	}), {
		successMessage: input.successMessage,
		apply: () => {
			detailDataContext.patchStaff(input.staffId, { isActive: input.isActive });
		},
		rollback: () => {
			if (previous) {
				detailDataContext.patchStaff(input.staffId, { isActive: previous.isActive });
			}
		},
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
	const previous = staffSnapshot(input.staffId);
	const email = input.email?.trim() ?? '';
	const nextName = `${input.firstName.trim()} ${input.lastName.trim()}`;

	const result = await runMutation(() => client.commands.updateStaffMemberProfile({
		staffId: input.staffId,
		firstName: input.firstName.trim(),
		lastName: input.lastName.trim(),
		email: email || null,
	}), {
		successMessage: input.successMessage,
		apply: () => {
			detailDataContext.patchStaff(input.staffId, {
				name: nextName,
				initials: staffInitials(input.firstName, input.lastName),
				email,
			});
		},
		rollback: () => {
			if (previous) {
				detailDataContext.patchStaff(input.staffId, previous);
			}
		},
	});
	return result !== null;
}
