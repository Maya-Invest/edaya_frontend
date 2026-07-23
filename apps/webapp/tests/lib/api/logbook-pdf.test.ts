import { describe, expect, mock, test } from 'bun:test';
import { ApiError } from '@maya-invest/edaya-api-client';

const renderClassLogbook = mock(async () => ({
	fileName: 'cahier.pdf',
	contentType: 'application/pdf' as const,
	downloadUrl: 'https://cdn.example/logbook.pdf',
	expiresAt: '2026-07-23T12:00:00.000Z',
	subjectCount: 2,
	sessionCount: 4,
}));

mock.module('$lib/api/school-client', () => ({
	getBrowserSchoolClient: () => ({
		commands: { renderClassLogbook },
	}),
}));

const { downloadClassLogbook } = await import('$lib/api/logbook-pdf');

describe('downloadClassLogbook', () => {
	test('opens the returned download URL', async () => {
		const open = mock(() => null);
		(globalThis as { window?: { open: typeof open } }).window = { open };

		const result = await downloadClassLogbook({ classGroupId: 'cg-1' });

		expect(result).toEqual({ status: 'ready', fileName: 'cahier.pdf' });
		expect(open).toHaveBeenCalledWith(
			'https://cdn.example/logbook.pdf',
			'_blank',
			'noopener,noreferrer',
		);
	});

	test('maps LOGBOOK_EMPTY to empty status', async () => {
		renderClassLogbook.mockRejectedValueOnce(new ApiError(409, {
			message: 'empty',
			code: 'LOGBOOK_EMPTY',
		}));

		await expect(downloadClassLogbook({ classGroupId: 'cg-1' }))
			.resolves
			.toEqual({ status: 'empty' });
	});
});
