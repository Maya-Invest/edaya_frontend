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
 * On-demand class logbook PDF: school API assembles + renders via docs, returns a download URL.
 * Browser never calls edaya_docs directly.
 */
export async function downloadClassLogbook(input: {
	classGroupId: string
	academicPeriodId?: string
	classSubjectId?: string
	locale?: 'fr' | 'en'
}): Promise<DownloadLogbookResult> {
	const client = getBrowserSchoolClient();
	try {
		const response = await client.commands.renderClassLogbook({
			classGroupId: input.classGroupId,
			...(input.academicPeriodId ? { academicPeriodId: input.academicPeriodId } : {}),
			...(input.classSubjectId ? { classSubjectId: input.classSubjectId } : {}),
			...(input.locale ? { locale: input.locale } : {}),
		}) as RenderClassLogbookResponse;

		if (!response?.downloadUrl) {
			return { status: 'error', message: 'Download URL missing from school API response' };
		}

		if (typeof window !== 'undefined') {
			window.open(response.downloadUrl, '_blank', 'noopener,noreferrer');
		}

		return { status: 'ready', fileName: response.fileName };
	}
	catch (error) {
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
