import type { Guardian } from '$lib/types/school';
import type { GuardiansPageState } from '../guardians-page.svelte';
import { academicContext } from '$lib/academic/context.svelte';
import { displayProfilePhotoUrl, uploadProfilePhoto } from '$lib/api/profile-photo-upload';
import { getBrowserSchoolClient } from '$lib/api/school-client';
import { authSession } from '$lib/auth/session.svelte';
import { runGuardianRouteMutation } from './guardian-route-mutation';

function schoolId(): string {
	return authSession.schoolId ?? academicContext.schools[0]?.id ?? 'sch-edaya-ci-cocody';
}

function guardianInitials(firstName: string, lastName: string): string {
	return `${firstName.trim()[0] ?? ''}${lastName.trim()[0] ?? ''}`;
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
		subjectId: null,
		photoUrl: null,
	};
}

export async function createGuardianOnPage(
	state: GuardiansPageState,
	input: {
		firstName: string;
		lastName: string;
		code?: string;
		email?: string;
		phone?: string;
		sendAccountInvitation?: boolean;
		successMessage?: string;
	},
): Promise<string | null> {
	const client = getBrowserSchoolClient();
	const email = input.email?.trim() ?? '';
	const phone = input.phone?.trim() ?? '';
	const code = input.code?.trim() || undefined;
	const id = crypto.randomUUID();
	const optimistic = buildOptimisticGuardian({ id, ...input });

	const result = await runGuardianRouteMutation({
		request: () => client.commands.registerGuardian({
			id,
			schoolId: schoolId(),
			firstName: input.firstName.trim(),
			lastName: input.lastName.trim(),
			...(code ? { code } : {}),
			email: email || null,
			phone: phone || null,
			contactMethods: buildContactMethods(email, phone),
			hasAccess: true,
			sendAccountInvitation: input.sendAccountInvitation ?? true,
			createdAt: new Date().toISOString(),
		}),
		apply: () => {
			state.appendGuardian(optimistic);
		},
		rollback: () => {
			state.removeGuardian(id);
		},
		successMessage: input.successMessage,
		versionKeys: ['guardians'],
	});

	return result ? id : null;
}

export async function updateGuardianContactOnPage(
	state: GuardiansPageState,
	input: {
		guardianId: string;
		firstName: string;
		lastName: string;
		email?: string;
		phone?: string;
		successMessage?: string;
	},
): Promise<boolean> {
	const client = getBrowserSchoolClient();
	const previous = state.findGuardian(input.guardianId);
	const email = input.email?.trim() ?? '';
	const phone = input.phone?.trim() ?? '';

	const result = await runGuardianRouteMutation({
		request: async () => {
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
		},
		apply: () => {
			state.patchGuardian(input.guardianId, {
				name: `${input.firstName.trim()} ${input.lastName.trim()}`,
				initials: guardianInitials(input.firstName, input.lastName),
				email,
				phone,
				preferredContact: email ? 'email' : phone ? 'phone' : 'email',
			});
		},
		rollback: () => {
			if (previous) {
				state.patchGuardian(input.guardianId, previous);
			}
		},
		successMessage: input.successMessage,
		versionKeys: ['guardians'],
	});

	return result !== null;
}

export async function deleteGuardianOnPage(
	state: GuardiansPageState,
	guardianId: string,
	options?: { successMessage?: string },
): Promise<boolean> {
	const client = getBrowserSchoolClient();
	const previous = state.findGuardian(guardianId);

	const result = await runGuardianRouteMutation({
		request: () => client.entities.guardians.delete({ id: guardianId }),
		apply: () => {
			state.removeGuardian(guardianId);
		},
		rollback: () => {
			if (previous) {
				state.mergeGuardians([previous]);
			}
		},
		successMessage: options?.successMessage,
		versionKeys: ['guardians'],
	});

	return result !== null;
}

export async function updateGuardianProfilePhotoOnPage(
	state: GuardiansPageState,
	input: {
		guardianId: string;
		file: File;
		successMessage?: string;
	},
): Promise<boolean> {
	const resolvedSchoolId = schoolId();
	if (!resolvedSchoolId) {
		return false;
	}

	const previous = state.findGuardian(input.guardianId)?.photoUrl ?? null;

	const result = await runGuardianRouteMutation({
		request: async () => {
			const uploaded = await uploadProfilePhoto({
				ownerKind: 'guardian',
				ownerId: input.guardianId,
				file: input.file,
				schoolId: resolvedSchoolId,
			});
			const client = getBrowserSchoolClient();
			const existing = await client.entities.guardians.get(input.guardianId);
			await client.commands.updateGuardianContactMethods({
				guardianId: input.guardianId,
				firstName: existing.firstName,
				lastName: existing.lastName,
				email: existing.email,
				phone: existing.phone,
				contactMethods: existing.contactMethods,
				hasAccess: existing.hasAccess,
				photoUrl: uploaded.photoUrl,
			});
			return displayProfilePhotoUrl(uploaded.attachmentId);
		},
		apply: () => {},
		rollback: () => {
			state.patchGuardian(input.guardianId, { photoUrl: previous });
		},
		onSuccess: (photoUrl) => {
			state.patchGuardian(input.guardianId, { photoUrl });
		},
		successMessage: input.successMessage,
		versionKeys: ['guardians'],
	});

	return result !== null;
}
