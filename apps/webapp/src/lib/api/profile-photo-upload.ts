import { PUBLIC_API_URL } from '$env/static/public';
import { academicContext } from '$lib/academic/context.svelte';
import { parseApiResponse, resolveApiUrl } from './http';
import { getBrowserSchoolClient } from './school-client';

export type ProfilePhotoOwnerKind = 'staff' | 'student' | 'guardian';

const PROFILE_PHOTO_FILE_NAME = 'profile.jpg';

interface UploadIntentResponse {
	attachmentId: string;
	storageKey: string;
	uploadUrl: string;
	expiresAt: string;
	headers?: Record<string, string>;
	status: 'pending_upload';
}

function apiHeaders(json = false): Headers {
	const headers = new Headers({ Accept: 'application/json' });
	if (json) {
		headers.set('Content-Type', 'application/json');
	}
	const yearId = academicContext.yearId;
	if (yearId) {
		headers.set('X-Academic-Year-Id', yearId);
	}
	return headers;
}

export function buildProfilePhotoContentUrl(attachmentId: string): string {
	return resolveApiUrl(PUBLIC_API_URL || '', `/core/files/${attachmentId}/content`);
}

export function withPhotoCacheBust(photoUrl: string): string {
	const separator = photoUrl.includes('?') ? '&' : '?';
	return `${photoUrl}${separator}v=${Date.now()}`;
}

export async function uploadProfilePhoto(input: {
	ownerKind: ProfilePhotoOwnerKind;
	ownerId: string;
	file: File;
	schoolId: string;
}): Promise<{ attachmentId: string; photoUrl: string }> {
	const mimeType = input.file.type || 'image/jpeg';

	const intentResponse = await fetch(
		resolveApiUrl(PUBLIC_API_URL || '', '/core/files/upload-intents'),
		{
			method: 'POST',
			headers: apiHeaders(true),
			credentials: 'include',
			body: JSON.stringify({
				ownerKind: input.ownerKind,
				ownerId: input.ownerId,
				fileName: PROFILE_PHOTO_FILE_NAME,
				mimeType,
				sizeBytes: input.file.size,
			}),
		},
	);
	const intent = await parseApiResponse<UploadIntentResponse>(
		'/core/files/upload-intents',
		intentResponse,
	);

	const uploadResponse = await fetch(intent.uploadUrl, {
		method: 'PUT',
		headers: intent.headers ?? { 'Content-Type': mimeType },
		body: input.file,
	});
	if (!uploadResponse.ok) {
		throw new Error(`Profile photo upload failed (${uploadResponse.status})`);
	}

	const client = getBrowserSchoolClient();
	await client.commands.registerAttachment({
		id: intent.attachmentId,
		schoolId: input.schoolId,
		ownerKind: input.ownerKind,
		ownerId: input.ownerId,
		fileName: PROFILE_PHOTO_FILE_NAME,
		storageKey: intent.storageKey,
		status: 'ready',
		mimeType,
		sizeBytes: input.file.size,
	});

	return {
		attachmentId: intent.attachmentId,
		photoUrl: buildProfilePhotoContentUrl(intent.attachmentId),
	};
}
