import type { ProfilePhotoOwnerKind } from '$lib/api/profile-photo-upload';
import type { EntityVersionKey } from '$lib/entity-versions.svelte';
import { runMutation } from '$lib/api/mutations/run-mutation';
import { displayProfilePhotoUrl, uploadProfilePhoto } from '$lib/api/profile-photo-upload';
import { getBrowserSchoolClient } from '$lib/api/school-client';
import { authSession } from '$lib/auth/session.svelte';

function schoolId(): string {
	return authSession.schoolId ?? '';
}

function versionKeyForOwner(ownerKind: ProfilePhotoOwnerKind): EntityVersionKey {
	switch (ownerKind) {
		case 'staff':
			return 'staff';
		case 'student':
			return 'students';
		case 'guardian':
			return 'guardians';
	}
}

async function uploadAndPublishSelfPhoto(input: {
	ownerKind: Exclude<ProfilePhotoOwnerKind, 'student'>;
	ownerId: string;
	file: File;
	successMessage?: string;
	onSuccess?: (photoUrl: string) => void;
}): Promise<boolean> {
	const resolvedSchoolId = schoolId();
	if (!resolvedSchoolId) {
		return false;
	}

	const result = await runMutation(async () => {
		const uploaded = await uploadProfilePhoto({
			ownerKind: input.ownerKind,
			ownerId: input.ownerId,
			file: input.file,
			schoolId: resolvedSchoolId,
		});
		const client = getBrowserSchoolClient();

		if (input.ownerKind === 'staff') {
			await client.commands.updateStaffMemberProfile({
				staffId: input.ownerId,
				photoUrl: uploaded.photoUrl,
			});
		}
		else {
			const existing = await client.entities.guardians.get(input.ownerId);
			await client.commands.updateGuardianContactMethods({
				guardianId: input.ownerId,
				photoUrl: uploaded.photoUrl,
				hasAccess: existing.hasAccess,
			});
		}

		return displayProfilePhotoUrl(uploaded.attachmentId);
	}, {
		successMessage: input.successMessage,
		versionKeys: [versionKeyForOwner(input.ownerKind)],
		onSuccess: (photoUrl) => {
			input.onSuccess?.(photoUrl);
		},
	});

	return result !== null;
}

export async function updateStaffProfilePhotoMutation(input: {
	staffId: string;
	file: File;
	successMessage?: string;
}): Promise<boolean> {
	return uploadAndPublishSelfPhoto({
		ownerKind: 'staff',
		ownerId: input.staffId,
		file: input.file,
		successMessage: input.successMessage,
		onSuccess: (photoUrl) => {
			if (authSession.userProfile?.id === input.staffId) {
				authSession.userProfile = { ...authSession.userProfile, photoUrl };
			}
		},
	});
}

export async function updateGuardianProfilePhotoMutation(input: {
	guardianId: string;
	file: File;
	successMessage?: string;
}): Promise<boolean> {
	return uploadAndPublishSelfPhoto({
		ownerKind: 'guardian',
		ownerId: input.guardianId,
		file: input.file,
		successMessage: input.successMessage,
	});
}
