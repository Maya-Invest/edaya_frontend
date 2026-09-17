import type { DocumentDownloadGrant } from '$lib/api/documents-types';

export function openDocumentDownload(grant: DocumentDownloadGrant): void {
	window.open(grant.downloadUrl, '_blank', 'noopener,noreferrer');
}

export function openDocumentDownloads(grants: readonly DocumentDownloadGrant[]): void {
	for (const grant of grants) {
		openDocumentDownload(grant);
	}
}
