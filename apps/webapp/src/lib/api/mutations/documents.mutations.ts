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
import { documentRequestErrorMessage } from '$lib/documents/request-error';
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

async function waitForTerminalIssuance(issuance: DocumentIssuance, timeoutMs = 45000): Promise<DocumentIssuance> {
	if (issuance.status !== 'requested' && issuance.status !== 'rendering')
		return issuance;
	const client = getBrowserSchoolClient();
	const started = Date.now();
	let latest = await loadDocumentIssuance(client, issuance.id);
	while (latest.status === 'requested' || latest.status === 'rendering') {
		if (Date.now() - started >= timeoutMs)
			return latest;
		await sleep(500);
		latest = await loadDocumentIssuance(client, issuance.id);
	}
	entityVersions.bump('documents');
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

async function finishDocumentRequest(issuance: DocumentIssuance, openWhenReady: boolean) {
	const settled = await waitForTerminalIssuance(issuance);
	if (settled.status === 'ready' || settled.status === 'preview') {
		if (openWhenReady)
			await downloadDocumentMutation({ id: settled.id });
		return settled;
	}
	if (settled.status === 'failed') {
		toast.error(get(t)('documents.toastFailed', { code: settled.failureCode ?? settled.status }));
		return settled;
	}
	const message = settled.status === 'superseded' || settled.status === 'voided'
		? get(t)(`documents.status.${settled.status}`)
		: get(t)('documents.toastRendering');
	toast.info(message);
	return settled;
}

export async function requestDocumentIssuanceMutation(input: Omit<RequestDocumentIssuanceInput, 'requestId' | 'locale'> & {
	requestId?: string;
	locale?: RequestDocumentIssuanceInput['locale'];
	successMessage?: string;
	openWhenReady?: boolean;
	onError?: (message: string) => void;
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
		async () => {
			try {
				return await documentCommand(client, 'requestDocumentIssuance', 'request-document-issuance', payload);
			}
			catch (error) {
				const message = documentRequestErrorMessage(error, input.templateKey, get(t));
				input.onError?.(message);
				throw new Error(message);
			}
		},
		{
			successMessage: input.successMessage,
			versionKeys: [...DOCUMENT_VERSION_KEYS],
		},
	);
	if (result === null) {
		return null;
	}
	return finishDocumentRequest(unwrapIssuance(result), input.openWhenReady !== false);
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
	return finishDocumentRequest(unwrapIssuance(result), input.openWhenReady !== false);
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
