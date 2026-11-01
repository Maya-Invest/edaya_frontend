import type { DocumentTemplateKey } from '$lib/api/documents-types';

export function documentTemplateTitleKey(templateKey: DocumentTemplateKey): string {
	return `documents.templates.${templateKey}`;
}

export function downloadDocumentLabel(
	translate: (key: string, vars?: Record<string, string | number>) => string,
	templateKey: DocumentTemplateKey,
): string {
	return translate('documents.downloadNamed', {
		name: translate(documentTemplateTitleKey(templateKey)),
	});
}
