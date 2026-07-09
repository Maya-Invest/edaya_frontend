import type { ProfilePhotoOwnerKind } from '$lib/api/profile-photo-upload';
import { runMutation } from '$lib/api/mutations/run-mutation';
import { uploadProfilePhoto, withPhotoCacheBust } from '$lib/api/profile-photo-upload';
import { getBrowserSchoolClient } from '$lib/api/school-client';
import { authSession } from '$lib/auth/session.svelte';
import { detailDataContext } from '$lib/detail-data/context.svelte';

function schoolId(): string {
	return authSession.schoolId ?? '';
}

async function uploadAndSetPhotoUrl(input: {
	ownerKind: ProfilePhotoOwnerKind;
	ownerId: string;
	file: File;
	successMessage?: string;
	apply: (photoUrl: string) => void;
	rollback: () => void;
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
		onSuccess: (photoUrl) => {
			input.apply(photoUrl);
		},
		rollback: input.rollback,
	});

	return result !== null;
}

export async function updateStaffProfilePhotoMutation(input: {
	staffId: string;
	file: File;
	successMessage?: string;
}): Promise<boolean> {
	const previous = detailDataContext.staff.find(member => member.id === input.staffId)?.photoUrl ?? null;

	return uploadAndSetPhotoUrl({
		ownerKind: 'staff',
		ownerId: input.staffId,
		file: input.file,
		successMessage: input.successMessage,
		apply: (photoUrl) => {
			detailDataContext.patchStaff(input.staffId, { photoUrl });
			if (authSession.userProfile?.id === input.staffId) {
				authSession.userProfile = { ...authSession.userProfile, photoUrl };
			}
		},
		rollback: () => {
			detailDataContext.patchStaff(input.staffId, { photoUrl: previous });
			if (authSession.userProfile?.id === input.staffId) {
				authSession.userProfile = { ...authSession.userProfile, photoUrl: previous };
			}
		},
	});
}

export async function updateStudentProfilePhotoMutation(input: {
	studentId: string;
	file: File;
	successMessage?: string;
}): Promise<boolean> {
	const previous = detailDataContext.students.find(student => student.id === input.studentId)?.photoUrl ?? null;

	return uploadAndSetPhotoUrl({
		ownerKind: 'student',
		ownerId: input.studentId,
		file: input.file,
		successMessage: input.successMessage,
		apply: photoUrl => detailDataContext.patchStudent(input.studentId, { photoUrl }),
		rollback: () => detailDataContext.patchStudent(input.studentId, { photoUrl: previous }),
	});
}

export async function updateGuardianProfilePhotoMutation(input: {
	guardianId: string;
	file: File;
	successMessage?: string;
}): Promise<boolean> {
	const previous = detailDataContext.guardians.find(guardian => guardian.id === input.guardianId)?.photoUrl ?? null;

	return uploadAndSetPhotoUrl({
		ownerKind: 'guardian',
		ownerId: input.guardianId,
		file: input.file,
		successMessage: input.successMessage,
		apply: photoUrl => detailDataContext.patchGuardian(input.guardianId, { photoUrl }),
		rollback: () => detailDataContext.patchGuardian(input.guardianId, { photoUrl: previous }),
	});
}
