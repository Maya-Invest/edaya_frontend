import type { components } from '$lib/api/schema';
import { getBrowserSchoolClient } from './school-client';
import { ApiError } from '@maya-invest/edaya-api-client';

export type RenderClassLogbookResponse = components['schemas']['RenderClassLogbookResponse'];

export type DownloadLogbookResult
	= | { status: 'ready'; fileName: string }
		| { status: 'empty' }
		| { status: 'not_configured' }
		| { status: 'error'; message?: string };

function apiErrorCode(error: unknown): string | undefined {
	if (!(error instanceof ApiError) || !error.body || typeof error.body !== 'object') {
		return undefined;
	}
	const code = (error.body as Record<string, unknown>).code;
	return typeof code === 'string' ? code : undefined;
}

/**
 * Prefer same-origin `/core/...` paths so the Vite proxy keeps the session cookie.
 * Absolute `http://localhost:9999/...` URLs open cross-port and often fail auth in the browser.
 */
export function toBrowserDownloadUrl(downloadUrl: string): string {
	try {
		const parsed = /^https?:\/\//i.test(downloadUrl)
			? new URL(downloadUrl)
			: new URL(downloadUrl, 'http://localhost');
		if (parsed.pathname.startsWith('/core/') || parsed.pathname.startsWith('/auth/') || parsed.pathname.startsWith('/public/')) {
			return `${parsed.pathname}${parsed.search}`;
		}
		return downloadUrl;
	}
	catch {
		return downloadUrl;
	}
}

function openDownloadUrl(downloadUrl: string, pendingTab: Window | null) {
	const url = toBrowserDownloadUrl(downloadUrl);
	if (pendingTab && !pendingTab.closed) {
		pendingTab.location.replace(url);
		return;
	}
	if (typeof document === 'undefined') {
		return;
	}
	const anchor = document.createElement('a');
	anchor.href = url;
	anchor.target = '_blank';
	anchor.rel = 'noopener noreferrer';
	document.body.appendChild(anchor);
	anchor.click();
	anchor.remove();
}

async function requestLogbookPdf(input: {
	classGroupId: string
	academicPeriodId?: string
	classSubjectId?: string
	locale?: 'fr' | 'en'
}): Promise<RenderClassLogbookResponse> {
	const client = getBrowserSchoolClient();
	return await client.commands.renderClassLogbook({
		classGroupId: input.classGroupId,
		...(input.academicPeriodId ? { academicPeriodId: input.academicPeriodId } : {}),
		...(input.classSubjectId ? { classSubjectId: input.classSubjectId } : {}),
		...(input.locale ? { locale: input.locale } : {}),
	}) as RenderClassLogbookResponse;
}

/**
 * On-demand class logbook PDF: school API assembles + renders via docs, returns a download URL.
 * Browser never calls edaya_docs directly.
 */
export async function downloadClassLogbook(input: {
	classGroupId: string
	academicPeriodId?: string
	classSubjectId?: string
	locale?: 'fr' | 'en'
}): Promise<DownloadLogbookResult> {
	// Open synchronously under the user gesture so popup blockers do not swallow the PDF tab
	// after the async render round-trip.
	const pendingTab = typeof window !== 'undefined'
		? window.open('about:blank', '_blank')
		: null;

	try {
		let response: RenderClassLogbookResponse;
		try {
			response = await requestLogbookPdf(input);
		}
		catch (error) {
			// Demo (and sparse periods) may have notes only outside the selected trimester —
			// retry year-wide so the teaching CTA still delivers a PDF when content exists.
			if (apiErrorCode(error) === 'LOGBOOK_EMPTY' && input.academicPeriodId) {
				response = await requestLogbookPdf({
					classGroupId: input.classGroupId,
					classSubjectId: input.classSubjectId,
					locale: input.locale,
				});
			}
			else {
				throw error;
			}
		}

		if (!response?.downloadUrl) {
			pendingTab?.close();
			return { status: 'error', message: 'Download URL missing from school API response' };
		}

		openDownloadUrl(response.downloadUrl, pendingTab);
		return { status: 'ready', fileName: response.fileName };
	}
	catch (error) {
		pendingTab?.close();
		const code = apiErrorCode(error);
		if (code === 'LOGBOOK_EMPTY') {
			return { status: 'empty' };
		}
		if (code === 'DOCS_NOT_CONFIGURED') {
			return { status: 'not_configured' };
		}
		return {
			status: 'error',
			message: error instanceof Error ? error.message : undefined,
		};
	}
}
