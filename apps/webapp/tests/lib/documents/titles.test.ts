import { describe, expect, it } from 'bun:test';
import { documentTemplateTitleKey, downloadDocumentLabel } from '$lib/documents/titles';

describe('document template labels', () => {
	it('builds i18n keys and named download copy', () => {
		expect(documentTemplateTitleKey('schooling-certificate.v1')).toBe(
			'documents.templates.schooling-certificate.v1',
		);
		const translate = (key: string, vars?: Record<string, string | number>) => {
			if (key === 'documents.downloadNamed') {
				return `Download ${vars?.name}`;
			}
			if (key === 'documents.templates.schooling-certificate.v1') {
				return 'Schooling certificate';
			}
			return key;
		};
		expect(downloadDocumentLabel(translate, 'schooling-certificate.v1')).toBe(
			'Download Schooling certificate',
		);
	});
});
