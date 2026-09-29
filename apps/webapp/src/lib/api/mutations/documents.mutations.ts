import type {
	DocumentIssuance,
	DocumentStaffFields,
	DocumentTemplateKey,
	RequestDocumentIssuanceBatchItem,
	RequestDocumentIssuanceInput,
} from '$lib/api/documents-types';
import { academicContext } from '$lib/academic/context.svelte';
import { documentCommand } from '$lib/api/documents-client';
import { grantDocumentBundleDownload, grantDocumentDownload, loadDocumentIssuance } from '$lib/api/documents-data';
import { runMutation } from '$lib/api/mutations/run-mutation';
import { getBrowserSchoolClient } from '$lib/api/school-client';
import { openDocumentDownload, openDocumentDownloads } from '$lib/documents/open-download';
import { entityVersions } from '$lib/entity-versions.svelte';
import { lang, t } from '$lib/i18n';
import { toast } from '$lib/toast.svelte';
import { get } from 'svelte/store';

const DOCUMENT_VERSION_KEYS = ['documents'] as const;

function requestLocale() {
	return get(lang);
}

function sleep(ms: number) {
	return new Promise(resolve => setTimeout(resolve, ms));
}

async function waitForTerminalIssuance(id: string, timeoutMs = 45000): Promise<DocumentIssuance> {
	const client = getBrowserSchoolClient();
	const started = Date.now();
	let latest = await loadDocumentIssuance(client, id);
	while (Date.now() - started < timeoutMs) {
		if (latest.status === 'ready' || latest.status === 'preview' || latest.status === 'failed' || latest.status === 'voided') {
			// Rendering finishes after the command's initial invalidation. Refresh
			// the document list again so its actions reflect the terminal state.
			entityVersions.bump('documents');
			return latest;
		}
		await sleep(500);
		latest = await loadDocumentIssuance(client, id);
	}
	return latest;
}

function unwrapIssuance(result: unknown): DocumentIssuance {
	if (result && typeof result === 'object' && 'id' in result && 'status' in result) {
		return result as DocumentIssuance;
	}
	if (result && typeof result === 'object' && 'issuance' in result) {
		return (result as { issuance: DocumentIssuance }).issuance;
	}
	throw new Error('Document issuance response was empty');
}

export async function requestDocumentIssuanceMutation(input: Omit<RequestDocumentIssuanceInput, 'requestId' | 'locale'> & {
	requestId?: string;
	locale?: RequestDocumentIssuanceInput['locale'];
	successMessage?: string;
	openWhenReady?: boolean;
}): Promise<DocumentIssuance | null> {
	const client = getBrowserSchoolClient();
	const payload: RequestDocumentIssuanceInput = {
		requestId: input.requestId ?? crypto.randomUUID(),
		templateKey: input.templateKey,
		sourceId: input.sourceId,
		locale: input.locale ?? requestLocale(),
		academicYearId: input.academicYearId ?? (academicContext.yearId || undefined),
		academicPeriodId: input.academicPeriodId,
		classSubjectId: input.classSubjectId,
		studentId: input.studentId,
		classGroupId: input.classGroupId,
		teacherId: input.teacherId,
		staffFields: input.staffFields,
	};
	const result = await runMutation(
		() => documentCommand(client, 'requestDocumentIssuance', 'request-document-issuance', payload),
		{
			successMessage: input.successMessage,
			versionKeys: [...DOCUMENT_VERSION_KEYS],
		},
	);
	if (result === null) {
		return null;
	}
	const issuance = unwrapIssuance(result);
	const settled = await waitForTerminalIssuance(issuance.id);
	if (settled.status === 'ready' || settled.status === 'preview') {
		if (input.openWhenReady !== false)
			await downloadDocumentMutation({ id: settled.id });
		return settled;
	}
	if (settled.status === 'failed') {
		toast.error(get(t)('documents.toastFailed', { code: settled.failureCode ?? settled.status }));
		return settled;
	}
	toast.info(get(t)('documents.toastRendering'));
	return settled;
}

export async function requestDocumentIssuanceBatchMutation(input: {
	templateKey: DocumentTemplateKey;
	items: RequestDocumentIssuanceBatchItem[];
	locale?: RequestDocumentIssuanceInput['locale'];
	academicYearId?: string;
	successMessage?: string;
}): Promise<{ items: Array<{ sourceId: string; status: string; issuanceId?: string; failureCode?: string }> } | null> {
	const client = getBrowserSchoolClient();
	const result = await runMutation(
		() => documentCommand(client, 'requestDocumentIssuanceBatch', 'request-document-issuance-batch', {
			requestId: crypto.randomUUID(),
			templateKey: input.templateKey,
			locale: input.locale ?? requestLocale(),
			academicYearId: input.academicYearId ?? (academicContext.yearId || undefined),
			items: input.items,
		}),
		{
			successMessage: input.successMessage,
			versionKeys: [...DOCUMENT_VERSION_KEYS],
		},
	);
	return result as { items: Array<{ sourceId: string; status: string; issuanceId?: string; failureCode?: string }> } | null;
}

export async function retryDocumentIssuanceMutation(input: {
	issuanceId: string;
	successMessage?: string;
	openWhenReady?: boolean;
}): Promise<DocumentIssuance | null> {
	const client = getBrowserSchoolClient();
	const result = await runMutation(
		() => documentCommand(client, 'retryDocumentIssuance', 'retry-document-issuance', {
			requestId: crypto.randomUUID(),
			issuanceId: input.issuanceId,
		}),
		{
			successMessage: input.successMessage,
			versionKeys: [...DOCUMENT_VERSION_KEYS],
		},
	);
	if (result === null) {
		return null;
	}
	const issuance = unwrapIssuance(result);
	const settled = await waitForTerminalIssuance(issuance.id);
	if (settled.status === 'ready' || settled.status === 'preview') {
		if (input.openWhenReady !== false)
			await downloadDocumentMutation({ id: settled.id });
	}
	else if (settled.status === 'failed') {
		toast.error(get(t)('documents.toastFailed', { code: settled.failureCode ?? settled.status }));
	}
	else {
		toast.info(get(t)('documents.toastRendering'));
	}
	return settled;
}

export async function voidDocumentIssuanceMutation(input: {
	issuanceId: string;
	reason: string;
	successMessage?: string;
}): Promise<boolean> {
	const client = getBrowserSchoolClient();
	const result = await runMutation(
		() => documentCommand(client, 'voidDocumentIssuance', 'void-document-issuance', {
			requestId: crypto.randomUUID(),
			issuanceId: input.issuanceId,
			reason: input.reason.trim(),
		}),
		{
			successMessage: input.successMessage,
			versionKeys: [...DOCUMENT_VERSION_KEYS],
		},
	);
	return result !== null;
}

export async function downloadDocumentMutation(input: { id: string }): Promise<boolean> {
	const client = getBrowserSchoolClient();
	try {
		const grant = await grantDocumentDownload(client, input.id);
		await openDocumentDownload(grant);
		return true;
	}
	catch (error) {
		toast.error(error instanceof Error ? error.message : get(t)('documents.downloadFailed'));
		return false;
	}
}

export async function downloadDocumentBundleMutation(input: { issuanceIds: string[] }): Promise<boolean> {
	const client = getBrowserSchoolClient();
	try {
		const grants = await grantDocumentBundleDownload(client, input.issuanceIds);
		await openDocumentDownloads(grants);
		return grants.length > 0;
	}
	catch (error) {
		toast.error(error instanceof Error ? error.message : get(t)('documents.downloadFailed'));
		return false;
	}
}

export async function requestConvocationMutation(input: {
	studentId: string;
	staffFields: DocumentStaffFields;
	successMessage?: string;
}): Promise<DocumentIssuance | null> {
	return requestDocumentIssuanceMutation({
		templateKey: 'convocation.v1',
		sourceId: input.studentId,
		studentId: input.studentId,
		staffFields: input.staffFields,
		successMessage: input.successMessage,
	});
}
