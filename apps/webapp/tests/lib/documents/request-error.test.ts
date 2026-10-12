import { documentRequestErrorMessage } from '$lib/documents/request-error';
import { en } from '$lib/i18n/dictionaries/en';
import { fr } from '$lib/i18n/dictionaries/fr';
import { ApiError } from '@maya-invest/edaya-api-client';
import { describe, expect, it } from 'bun:test';

describe('timetable document request errors', () => {
	for (const [locale, dictionary] of Object.entries({ en, fr })) {
		const translate = (key: string) => (dictionary as Record<string, string>)[key]!;
		it(`explains an empty timetable in ${locale} instead of suggesting a reload`, () => {
			const error = new ApiError(409, {
				code: 'DOCUMENT_TIMETABLE_EMPTY',
				message: 'No timetable sessions exist for this teacher',
			});
			expect(documentRequestErrorMessage(error, 'teacher-timetable.v1', translate)).toBe(dictionary['documents.teacherTimetableEmpty']);
			expect(documentRequestErrorMessage(error, 'class-timetable.v1', translate)).toBe(dictionary['documents.classTimetableEmpty']);
		});
		it(`keeps concurrency and permission errors distinct in ${locale}`, () => {
			expect(documentRequestErrorMessage(new ApiError(409, { message: 'internal-receipt-id' }), 'teacher-timetable.v1', translate)).toBe(dictionary['mutation.conflict']);
			expect(documentRequestErrorMessage(new ApiError(403, { message: 'Permission required' }), 'teacher-timetable.v1', translate)).toBe('Permission required');
			expect(documentRequestErrorMessage(new Error('Connection lost'), 'teacher-timetable.v1', translate)).toBe('Connection lost');
		});
	}
});
