import type { components } from '$lib/api/schema';
import type { Guardian } from '$lib/types/school';
import type { GuardiansPageState } from '../guardians-page.svelte';
import { academicContext } from '$lib/academic/context.svelte';
import { displayProfilePhotoUrl, uploadProfilePhoto } from '$lib/api/profile-photo-upload';
import { getBrowserSchoolClient } from '$lib/api/school-client';
import { authSession } from '$lib/auth/session.svelte';
import { guardianIdentityPayload } from '$lib/people-profile-fields';
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
	profile?: Record<string, string>;
	code?: string;
	firstName: string;
	lastName: string;
	hasAccess?: boolean;
	contactMethods?: components['schemas']['Guardian']['contactMethods'];
	email?: string;
	phone?: string;
}): Guardian {
	const email = input.email?.trim() ?? '';
	const phone = input.phone?.trim() ?? '';
	return {
		...guardianIdentityPayload(input.profile),
		code: input.code?.trim() || null,
		id: input.id,
		firstName: input.firstName.trim(),
		lastName: input.lastName.trim(),
		name: `${input.firstName.trim()} ${input.lastName.trim()}`,
		initials: guardianInitials(input.firstName, input.lastName),
		relation: 'Legal guardian',
		hasAccess: input.hasAccess ?? true,
		contactMethods: input.contactMethods ?? buildContactMethods(email, phone),
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
		profile?: Record<string, string>;
		lastName: string;
		code?: string;
		email?: string;
		phone?: string;
		contactMethods?: components['schemas']['Guardian']['contactMethods'];
		hasAccess?: boolean;
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
			...guardianIdentityPayload(input.profile),
			firstName: input.firstName.trim(),
			lastName: input.lastName.trim(),
			...(code ? { code } : {}),
			email: email || null,
			phone: phone || null,
			contactMethods: input.contactMethods ?? buildContactMethods(email, phone),
			hasAccess: input.hasAccess ?? true,
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
		profile?: Record<string, string>;
		firstName: string;
		lastName: string;
		email?: string;
		phone?: string;
		contactMethods?: components['schemas']['Guardian']['contactMethods'];
		hasAccess?: boolean;
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
				...guardianIdentityPayload(input.profile),
				firstName: input.firstName.trim(),
				lastName: input.lastName.trim(),
				email: email || null,
				phone: phone || null,
				contactMethods: input.contactMethods ?? existing.contactMethods,
				hasAccess: input.hasAccess ?? existing.hasAccess,
			});
		},
		apply: () => {
			state.patchGuardian(input.guardianId, {
				...guardianIdentityPayload(input.profile),
				firstName: input.firstName.trim(),
				lastName: input.lastName.trim(),
				name: `${input.firstName.trim()} ${input.lastName.trim()}`,
				initials: guardianInitials(input.firstName, input.lastName),
				email,
				phone,
				...(input.contactMethods ? { contactMethods: input.contactMethods } : {}),
				...(input.hasAccess !== undefined ? { hasAccess: input.hasAccess } : {}),
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
