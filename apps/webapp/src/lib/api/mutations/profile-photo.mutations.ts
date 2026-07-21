import type { ProfilePhotoOwnerKind } from '$lib/api/profile-photo-upload';
import type { EntityVersionKey } from '$lib/entity-versions.svelte';
import { runMutation } from '$lib/api/mutations/run-mutation';
import { uploadProfilePhoto, withPhotoCacheBust } from '$lib/api/profile-photo-upload';
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

async function uploadAndSetPhotoUrl(input: {
	ownerKind: ProfilePhotoOwnerKind;
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
		const photoUrl = withPhotoCacheBust(uploaded.photoUrl);
		const client = getBrowserSchoolClient();

		switch (input.ownerKind) {
			case 'staff':
				await client.commands.updateStaffMemberProfile({
					staffId: input.ownerId,
					photoUrl,
				});
				break;
			case 'student':
				await client.commands.updateStudentProfile({
					studentId: input.ownerId,
					photoUrl,
				});
				break;
			case 'guardian': {
				const existing = await client.entities.guardians.get(input.ownerId);
				await client.commands.updateGuardianContactMethods({
					guardianId: input.ownerId,
					photoUrl,
					hasAccess: existing.hasAccess,
				});
				break;
			}
		}

		return photoUrl;
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
	return uploadAndSetPhotoUrl({
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

export async function updateStudentProfilePhotoMutation(input: {
	studentId: string;
	file: File;
	successMessage?: string;
}): Promise<boolean> {
	return uploadAndSetPhotoUrl({
		ownerKind: 'student',
		ownerId: input.studentId,
		file: input.file,
		successMessage: input.successMessage,
	});
}

export async function updateGuardianProfilePhotoMutation(input: {
	guardianId: string;
	file: File;
	successMessage?: string;
}): Promise<boolean> {
	return uploadAndSetPhotoUrl({
		ownerKind: 'guardian',
		ownerId: input.guardianId,
		file: input.file,
		successMessage: input.successMessage,
	});
}
