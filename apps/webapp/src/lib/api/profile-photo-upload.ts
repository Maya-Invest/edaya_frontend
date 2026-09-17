import { PUBLIC_API_URL } from '$env/static/public';
import { resolveApiUrl } from './http';
import { exportProfilePhotoJpeg, PROFILE_PHOTO_FILE_NAME, PROFILE_PHOTO_JPEG_MIME } from './profile-photo-normalize';
import {
	persistStoredId,
	profilePhotoAttachmentStorageKey,
	readStoredId,
} from './profile-photo-request';
import { getBrowserSchoolClient } from './school-client';

export type ProfilePhotoOwnerKind = 'staff' | 'student' | 'guardian';

export function profilePhotoContentPath(attachmentId: string): string {
	return `/core/files/${attachmentId}/content`;
}

export function buildProfilePhotoContentUrl(attachmentId: string): string {
	return resolveApiUrl(PUBLIC_API_URL, profilePhotoContentPath(attachmentId));
}

export function withPhotoCacheBust(photoUrl: string): string {
	const separator = photoUrl.includes('?') ? '&' : '?';
	return `${photoUrl}${separator}v=${Date.now()}`;
}

export function displayProfilePhotoUrl(attachmentId: string): string {
	return withPhotoCacheBust(buildProfilePhotoContentUrl(attachmentId));
}

export async function uploadProfilePhoto(input: {
	ownerKind: ProfilePhotoOwnerKind;
	ownerId: string;
	file: File;
	schoolId: string;
}): Promise<{ attachmentId: string; photoUrl: string }> {
	const jpeg = input.file.type === PROFILE_PHOTO_JPEG_MIME && input.file.name === PROFILE_PHOTO_FILE_NAME
		? input.file
		: await exportProfilePhotoJpeg({ source: input.file });
	const storageKey = profilePhotoAttachmentStorageKey(input.ownerKind, input.ownerId);
	const storedAttachmentId = readStoredId(storageKey);
	const client = getBrowserSchoolClient();
	const intent = await client.commands.createProfilePhotoUpload({
		ownerKind: input.ownerKind,
		ownerId: input.ownerId,
		fileName: PROFILE_PHOTO_FILE_NAME,
		mimeType: PROFILE_PHOTO_JPEG_MIME,
		sizeBytes: jpeg.size,
		...(storedAttachmentId ? { attachmentId: storedAttachmentId } : {}),
	});

	persistStoredId(storageKey, intent.attachmentId);

	const uploadResponse = await fetch(intent.uploadUrl, {
		method: 'PUT',
		headers: intent.headers ?? { 'Content-Type': PROFILE_PHOTO_JPEG_MIME },
		body: jpeg,
	});
	if (!uploadResponse.ok) {
		throw new Error(`Profile photo upload failed (${uploadResponse.status})`);
	}

	await client.commands.completeProfilePhotoUpload({
		id: intent.attachmentId,
		schoolId: input.schoolId,
		ownerKind: input.ownerKind,
		ownerId: input.ownerId,
		fileName: PROFILE_PHOTO_FILE_NAME,
		storageKey: intent.storageKey,
		status: 'ready',
		mimeType: PROFILE_PHOTO_JPEG_MIME,
		sizeBytes: jpeg.size,
	});

	return {
		attachmentId: intent.attachmentId,
		photoUrl: profilePhotoContentPath(intent.attachmentId),
	};
}
