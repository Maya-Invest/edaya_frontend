import type { Guardian } from '$lib/types/school';
import { academicContext } from '$lib/academic/context.svelte';
import { runMutation } from '$lib/api/mutations/run-mutation';
import { getBrowserSchoolClient } from '$lib/api/school-client';
import { authSession } from '$lib/auth/session.svelte';
import { detailDataContext } from '$lib/detail-data/context.svelte';

function schoolId(): string {
	return authSession.schoolId ?? academicContext.schools[0]?.id ?? 'sch-edaya-central';
}

function guardianInitials(firstName: string, lastName: string): string {
	return `${firstName.trim()[0] ?? ''}${lastName.trim()[0] ?? ''}`;
}

function guardianSnapshot(guardianId: string): Guardian | undefined {
	return detailDataContext.guardians.find(guardian => guardian.id === guardianId);
}

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

function buildOptimisticGuardian(input: {
	id: string;
	firstName: string;
	lastName: string;
	email?: string;
	phone?: string;
}): Guardian {
	const email = input.email?.trim() ?? '';
	const phone = input.phone?.trim() ?? '';
	return {
		id: input.id,
		name: `${input.firstName.trim()} ${input.lastName.trim()}`,
		initials: guardianInitials(input.firstName, input.lastName),
		relation: 'Legal guardian',
		email,
		phone,
		studentIds: [],
		preferredContact: email ? 'email' : phone ? 'phone' : 'email',
	};
}

export async function registerGuardianMutation(input: {
	firstName: string;
	lastName: string;
	email?: string;
	phone?: string;
	sendAccountInvitation?: boolean;
	successMessage?: string;
}): Promise<string | null> {
	const client = getBrowserSchoolClient();
	const id = `grd-${Date.now().toString(36)}`;
	const email = input.email?.trim() ?? '';
	const phone = input.phone?.trim() ?? '';
	const optimistic = buildOptimisticGuardian({ id, ...input });

	const result = await runMutation(() => client.commands.registerGuardian({
		id,
		schoolId: schoolId(),
		firstName: input.firstName.trim(),
		lastName: input.lastName.trim(),
		email: email || null,
		phone: phone || null,
		contactMethods: buildContactMethods(email, phone),
		hasAccess: true,
		sendAccountInvitation: input.sendAccountInvitation ?? true,
		createdAt: new Date().toISOString(),
	}), {
		successMessage: input.successMessage,
		apply: () => {
			detailDataContext.seedGuardians([optimistic]);
		},
		rollback: () => {
			detailDataContext.removeGuardian(id);
		},
	});
	return result ? id : null;
}

export async function updateGuardianContactMutation(input: {
	guardianId: string;
	firstName: string;
	lastName: string;
	email?: string;
	phone?: string;
	successMessage?: string;
}): Promise<boolean> {
	const client = getBrowserSchoolClient();
	const previous = guardianSnapshot(input.guardianId);
	const email = input.email?.trim() ?? '';
	const phone = input.phone?.trim() ?? '';

	const result = await runMutation(async () => {
		const existing = await client.entities.guardians.get(input.guardianId);

		return client.commands.updateGuardianContactMethods({
			guardianId: input.guardianId,
			firstName: input.firstName.trim(),
			lastName: input.lastName.trim(),
			email: email || null,
			phone: phone || null,
			contactMethods: buildContactMethods(email, phone),
			hasAccess: existing.hasAccess,
		});
	}, {
		successMessage: input.successMessage,
		apply: () => {
			detailDataContext.patchGuardian(input.guardianId, {
				name: `${input.firstName.trim()} ${input.lastName.trim()}`,
				initials: guardianInitials(input.firstName, input.lastName),
				email,
				phone,
				preferredContact: email ? 'email' : phone ? 'phone' : 'email',
			});
		},
		rollback: () => {
			if (previous) {
				detailDataContext.patchGuardian(input.guardianId, previous);
			}
		},
	});
	return result !== null;
}
