import type { DocumentDownloadGrant } from '$lib/api/documents-types';
import { PUBLIC_API_URL } from '$env/static/public';
import { bearerFetch } from '$lib/auth/bearer-fetch';
import { isAuthenticatedSchoolFileUrl } from '$lib/documents/school-file-url';

function triggerDownload(href: string, fileName?: string): void {
	const link = document.createElement('a');
	link.href = href;
	if (fileName) {
		link.download = fileName;
	}
	link.rel = 'noopener';
	document.body.appendChild(link);
	link.click();
	link.remove();
}

export async function openDocumentDownload(grant: DocumentDownloadGrant): Promise<void> {
	if (!isAuthenticatedSchoolFileUrl(grant.downloadUrl, PUBLIC_API_URL)) {
		window.open(grant.downloadUrl, '_blank', 'noopener,noreferrer');
		return;
	}
	const response = await bearerFetch(grant.downloadUrl);
	if (!response.ok) {
		throw new Error('Document download failed');
	}
	const objectUrl = URL.createObjectURL(await response.blob());
	try {
		triggerDownload(objectUrl, grant.fileName);
	}
	finally {
		URL.revokeObjectURL(objectUrl);
	}
}

export async function openDocumentDownloads(grants: readonly DocumentDownloadGrant[]): Promise<void> {
	for (const grant of grants) {
		await openDocumentDownload(grant);
	}
}
