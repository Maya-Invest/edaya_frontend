import type {
	DocumentDownloadGrant,
	DocumentIssuance,
	DocumentTemplateCatalogItem,
} from '$lib/api/documents-types';
import type { getBrowserSchoolClient } from '$lib/api/school-client';
import { documentQuery } from '$lib/api/documents-client';

export {
	attendanceSheetSourceId,
	studentYearAccountSourceId,
} from '$lib/api/documents-source-ids';

type SchoolClient = ReturnType<typeof getBrowserSchoolClient>;

export async function loadDocumentTemplates(client: SchoolClient): Promise<DocumentTemplateCatalogItem[]> {
	const result = await documentQuery<DocumentTemplateCatalogItem[] | { items?: DocumentTemplateCatalogItem[] }>(
		client,
		'listDocumentTemplates',
		'list-document-templates',
		{},
	);
	return Array.isArray(result) ? result : result.items ?? [];
}

export async function loadDocumentIssuances(
	client: SchoolClient,
	input: {
		studentId?: string;
		academicYearId?: string;
		classGroupId?: string;
		templateKey?: string;
		sourceId?: string;
		status?: string;
	} = {},
): Promise<DocumentIssuance[]> {
	const result = await documentQuery<DocumentIssuance[] | { items?: DocumentIssuance[] }>(
		client,
		'listDocumentIssuances',
		'list-document-issuances',
		input,
	);
	return Array.isArray(result) ? result : result.items ?? [];
}

export async function loadDocumentIssuance(client: SchoolClient, id: string): Promise<DocumentIssuance> {
	return documentQuery<DocumentIssuance>(client, 'getDocumentIssuance', 'get-document-issuance', { id });
}

export async function grantDocumentDownload(client: SchoolClient, id: string): Promise<DocumentDownloadGrant> {
	return documentQuery<DocumentDownloadGrant>(client, 'grantDocumentDownload', 'grant-document-download', { id });
}

export async function grantDocumentBundleDownload(
	client: SchoolClient,
	issuanceIds: string[],
): Promise<DocumentDownloadGrant[]> {
	const result = await documentQuery<{ items: DocumentDownloadGrant[] }>(
		client,
		'grantDocumentBundleDownload',
		'grant-document-bundle-download',
		{ issuanceIds },
	);
	return result.items ?? [];
}
