import type { components } from '$lib/api/schema';
import { getBrowserSchoolClient } from './school-client';

type Attachment = components['schemas']['Attachment'];
type FileDownloadUrlResponse = components['schemas']['FileDownloadUrlResponse'];

export type ReportCardPdfLookup
	= | { status: 'ready'; attachmentId: string; fileName: string }
		| { status: 'pending' }
		| { status: 'missing' };

function sleep(ms: number): Promise<void> {
	return new Promise(resolve => setTimeout(resolve, ms));
}

function isReadyPdf(attachment: Attachment): boolean {
	return attachment.status === 'ready'
		&& (attachment.mimeType === 'application/pdf'
			|| attachment.fileName.toLowerCase().endsWith('.pdf'));
}

/**
 * Finds a ready PDF attachment owned by a report-card result.
 * School API is the only download path — never call edaya_docs from the browser.
 */
export async function lookupReportCardPdf(resultId: string): Promise<ReportCardPdfLookup> {
	const client = getBrowserSchoolClient();
	const attachments = await client.entities.attachments.list({
		ownerKind: 'report_card',
		ownerId: resultId,
	} as never) as Attachment[] | null | undefined;

	const rows = attachments ?? [];
	const ready = rows.find(isReadyPdf);
	if (ready) {
		return {
			status: 'ready',
			attachmentId: ready.id,
			fileName: ready.fileName,
		};
	}

	if (rows.some(entry => entry.status === 'pending_upload')) {
		return { status: 'pending' };
	}

	return { status: 'missing' };
}

export async function resolveReportCardPdfDownloadUrl(attachmentId: string): Promise<string> {
	const client = getBrowserSchoolClient();
	const response = await client.files.getDownloadUrl({ attachmentId }) as FileDownloadUrlResponse;
	if (!response?.downloadUrl) {
		throw new Error('Download URL missing from school API response');
	}
	return response.downloadUrl;
}

/**
 * Opens the PDF in a new tab. Retries briefly after publish while background render finishes.
 */
export async function openReportCardPdf(resultId: string, options?: {
	attempts?: number;
	delayMs?: number;
}): Promise<ReportCardPdfLookup> {
	const attempts = options?.attempts ?? 4;
	const delayMs = options?.delayMs ?? 750;

	let last: ReportCardPdfLookup = { status: 'missing' };
	for (let attempt = 0; attempt < attempts; attempt += 1) {
		last = await lookupReportCardPdf(resultId);
		if (last.status === 'ready') {
			const downloadUrl = await resolveReportCardPdfDownloadUrl(last.attachmentId);
			if (typeof window !== 'undefined') {
				window.open(downloadUrl, '_blank', 'noopener,noreferrer');
			}
			return last;
		}
		if (attempt < attempts - 1) {
			await sleep(delayMs);
		}
	}

	return last;
}
