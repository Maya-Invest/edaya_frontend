import type { components } from '$lib/api/schema';
import type { Guardian } from '$lib/types/school';
import type { GuardiansPageState } from '../guardians-page.svelte';
import { academicContext } from '$lib/academic/context.svelte';
import { displayProfilePhotoUrl, uploadProfilePhoto } from '$lib/api/profile-photo-upload';
import { getBrowserSchoolClient } from '$lib/api/school-client';
import { authSession } from '$lib/auth/session.svelte';
import { guardianIdentityPayload } from '$lib/people-profile-fields';
import { runGuardianRouteMutation } from './guardian-route-mutation';

type ContactInput = Partial<Pick<components['schemas']['Guardian'], 'phone' | 'alternativePhone' | 'email' | 'emailNotificationsEnabled' | 'smsNotificationsEnabled' | 'pushNotificationsEnabled'>>;
function contactPatch(input: ContactInput): ContactInput {
	return Object.fromEntries(['phone', 'alternativePhone', 'email', 'emailNotificationsEnabled', 'smsNotificationsEnabled', 'pushNotificationsEnabled'].filter(key => input[key as keyof ContactInput] !== undefined).map(key => [key, input[key as keyof ContactInput]]));
}

function schoolId(): string {
	return authSession.schoolId ?? academicContext.schools[0]?.id ?? 'sch-edaya-ci-cocody';
}

function guardianInitials(firstName: string, lastName: string): string {
	return `${firstName.trim()[0] ?? ''}${lastName.trim()[0] ?? ''}`;
}

function buildOptimisticGuardian(input: ContactInput & {
	id: string;
	profile?: Record<string, string>;
	code?: string;
	firstName: string;
	lastName: string;
	hasAccess?: boolean;
}): Guardian {
	const email = input.email?.trim() ?? '';
	const phone = input.phone?.trim() ?? '';
	return {
		...guardianIdentityPayload(input.profile),
		code: input.code?.trim() || null,
		id: input.id,
		firstName: input.firstName.trim(),
		lastName: input.lastName.trim(),
		name: `${input.firstName.trim()} ${input.lastName.trim()}`.trim(),
		initials: guardianInitials(input.firstName, input.lastName),
		relation: 'Legal guardian',
		hasAccess: input.hasAccess ?? true,
		...contactPatch(input),
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
	input: ContactInput & {
		firstName: string;
		profile?: Record<string, string>;
		lastName: string;
		code?: string;
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
			...contactPatch(input),
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
	input: ContactInput & {
		guardianId: string;
		profile?: Record<string, string>;
		firstName: string;
		lastName: string;
		hasAccess?: boolean;
		successMessage?: string;
	},
): Promise<boolean> {
	const client = getBrowserSchoolClient();
	const scope = JSON.stringify([authSession.authUserId, authSession.schoolId, authSession.subjectId]);
	const email = input.email?.trim() ?? '';
	const phone = input.phone?.trim() ?? '';

	const result = await runGuardianRouteMutation({
		request: () => client.commands.updateGuardianProfile({
			guardianId: input.guardianId,
			...guardianIdentityPayload(input.profile),
			firstName: input.firstName.trim(),
			lastName: input.lastName.trim(),
			...contactPatch(input),
			...(input.hasAccess !== undefined ? { hasAccess: input.hasAccess } : {}),
		}),
		onSuccess: (saved) => {
			if (scope !== JSON.stringify([authSession.authUserId, authSession.schoolId, authSession.subjectId]))
				return;
			state.patchGuardian(input.guardianId, {
				...guardianIdentityPayload(input.profile),
				firstName: input.firstName.trim(),
				lastName: input.lastName.trim(),
				name: `${input.firstName.trim()} ${input.lastName.trim()}`.trim(),
				initials: guardianInitials(input.firstName, input.lastName),
				...contactPatch(input),
				email: saved.email ?? '',
				phone: saved.phone ?? '',
				alternativePhone: saved.alternativePhone,
				emailNotificationsEnabled: saved.emailNotificationsEnabled,
				smsNotificationsEnabled: saved.smsNotificationsEnabled,
				pushNotificationsEnabled: saved.pushNotificationsEnabled,
				...(input.hasAccess !== undefined ? { hasAccess: input.hasAccess } : {}),
				preferredContact: email ? 'email' : phone ? 'phone' : 'email',
			});
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
			await client.commands.updateGuardianProfile({ guardianId: input.guardianId, photoUrl: uploaded.photoUrl });
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
