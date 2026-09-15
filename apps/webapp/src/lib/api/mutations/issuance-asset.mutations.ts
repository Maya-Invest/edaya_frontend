import { documentCommand } from '$lib/api/documents-client';
import { runMutation } from '$lib/api/mutations/run-mutation';
import { persistStoredId, readStoredId } from '$lib/api/profile-photo-request';
import { getBrowserSchoolClient } from '$lib/api/school-client';
import { authSession } from '$lib/auth/session.svelte';

export type SchoolIssuanceAssetPurpose
	= | 'school.logo'
		| 'school.crest'
		| 'school.stamp'
		| 'school.signature';

const ALLOWED_TYPES = new Set(['image/png', 'image/jpeg', 'image/webp']);
const MAX_BYTES = 1_048_576;

function storageKey(purpose: SchoolIssuanceAssetPurpose): string {
	return `edaya.school-issuance-asset.${purpose}`;
}

export async function uploadSchoolIssuanceAssetMutation(input: {
	purpose: SchoolIssuanceAssetPurpose;
	file: File;
	successMessage?: string;
}): Promise<boolean> {
	if (!ALLOWED_TYPES.has(input.file.type)) {
		throw new Error('Unsupported image type');
	}
	if (input.file.size > MAX_BYTES) {
		throw new Error('Image is larger than 1 MiB');
	}
	const schoolId = authSession.schoolId;
	if (!schoolId) {
		return false;
	}

	const result = await runMutation(async () => {
		const client = getBrowserSchoolClient();
		const storedAttachmentId = readStoredId(storageKey(input.purpose));
		const intent = await documentCommand<{
			attachmentId: string;
			storageKey: string;
			uploadUrl: string;
			headers?: Record<string, string>;
		}>(client, 'createSchoolIssuanceAssetUpload', 'create-school-issuance-asset-upload', {
			purpose: input.purpose,
			fileName: input.file.name,
			mimeType: input.file.type,
			sizeBytes: input.file.size,
			...(storedAttachmentId ? { attachmentId: storedAttachmentId } : {}),
		});
		persistStoredId(storageKey(input.purpose), intent.attachmentId);
		const uploadResponse = await fetch(intent.uploadUrl, {
			method: 'PUT',
			headers: intent.headers ?? { 'Content-Type': input.file.type },
			body: input.file,
		});
		if (!uploadResponse.ok) {
			throw new Error(`Issuance asset upload failed (${uploadResponse.status})`);
		}
		await documentCommand(client, 'completeSchoolIssuanceAssetUpload', 'complete-school-issuance-asset-upload', {
			id: intent.attachmentId,
			schoolId,
			ownerKind: 'school',
			ownerId: schoolId,
			fileName: input.file.name,
			storageKey: intent.storageKey,
			status: 'ready',
			mimeType: input.file.type,
			sizeBytes: input.file.size,
			purpose: input.purpose,
		});
		return intent.attachmentId;
	}, {
		successMessage: input.successMessage,
		versionKeys: ['documents'],
		refresh: true,
	});

	return result !== null;
}

export async function clearSchoolIssuanceAssetMutation(input: {
	purpose: SchoolIssuanceAssetPurpose;
	successMessage?: string;
}): Promise<boolean> {
	const result = await runMutation(async () => {
		const client = getBrowserSchoolClient();
		return documentCommand(client, 'clearSchoolIssuanceAsset', 'clear-school-issuance-asset', {
			purpose: input.purpose,
		});
	}, {
		successMessage: input.successMessage,
		versionKeys: ['documents'],
		refresh: true,
	});
	return result !== null;
}
