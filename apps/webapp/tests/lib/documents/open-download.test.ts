import { describe, expect, it } from 'bun:test';
import { isAuthenticatedSchoolFileUrl } from '$lib/documents/school-file-url';

describe('isAuthenticatedSchoolFileUrl', () => {
	const api = 'http://localhost:9999';

	it('treats local memory file grants as authenticated school files', () => {
		expect(isAuthenticatedSchoolFileUrl(
			'http://localhost:9999/core/files/memory/sch-edaya-ci-cocody%2Fgenerated%2Fdocument%2Ffile.pdf?fileName=fiche.pdf',
			api,
		)).toBe(true);
	});

	it('leaves signed object-storage URLs for a new tab', () => {
		expect(isAuthenticatedSchoolFileUrl(
			'http://localhost:9200/download?token=signed',
			api,
		)).toBe(false);
		expect(isAuthenticatedSchoolFileUrl(
			'https://files.example/bucket/doc.pdf?X-Amz-Signature=abc',
			api,
		)).toBe(false);
	});
});
