import { beforeEach, describe, expect, mock, test } from 'bun:test';
import { ApiError } from '@maya-invest/edaya-api-client';

const renderClassLogbook = mock(async () => ({
	fileName: 'cahier.pdf',
	contentType: 'application/pdf' as const,
	downloadUrl: 'http://localhost:9999/core/files/memory/sch%2Flogbook.pdf?fileName=cahier.pdf',
	expiresAt: '2026-07-23T12:00:00.000Z',
	subjectCount: 2,
	sessionCount: 4,
}));

mock.module('$lib/api/school-client', () => ({
	getBrowserSchoolClient: () => ({
		commands: { renderClassLogbook },
	}),
}));

const { downloadClassLogbook, toBrowserDownloadUrl } = await import('$lib/api/logbook-pdf');

describe('toBrowserDownloadUrl', () => {
	test('rewrites absolute API file URLs to same-origin paths', () => {
		expect(toBrowserDownloadUrl(
			'http://localhost:9999/core/files/memory/sch%2Flogbook.pdf?fileName=cahier.pdf',
		)).toBe('/core/files/memory/sch%2Flogbook.pdf?fileName=cahier.pdf');
	});
});

describe('downloadClassLogbook', () => {
	beforeEach(() => {
		renderClassLogbook.mockReset();
		renderClassLogbook.mockResolvedValue({
			fileName: 'cahier.pdf',
			contentType: 'application/pdf' as const,
			downloadUrl: 'http://localhost:9999/core/files/memory/sch%2Flogbook.pdf?fileName=cahier.pdf',
			expiresAt: '2026-07-23T12:00:00.000Z',
			subjectCount: 2,
			sessionCount: 4,
		});
	});

	test('opens a blank tab then navigates to the proxied download URL', async () => {
		const replace = mock(() => undefined);
		const pendingTab = { closed: false, location: { replace } };
		const open = mock(() => pendingTab);
		(globalThis as { window?: { open: typeof open } }).window = { open };

		const result = await downloadClassLogbook({ classGroupId: 'cg-1', academicPeriodId: 't3' });

		expect(result).toEqual({ status: 'ready', fileName: 'cahier.pdf' });
		expect(open).toHaveBeenCalledWith('about:blank', '_blank');
		expect(replace).toHaveBeenCalledWith(
			'/core/files/memory/sch%2Flogbook.pdf?fileName=cahier.pdf',
		);
	});

	test('retries without period when the selected period is empty', async () => {
		renderClassLogbook
			.mockRejectedValueOnce(new ApiError(409, {
				message: 'empty',
				code: 'LOGBOOK_EMPTY',
			}))
			.mockResolvedValueOnce({
				fileName: 'cahier.pdf',
				contentType: 'application/pdf' as const,
				downloadUrl: 'http://localhost:9999/core/files/memory/ok.pdf',
				expiresAt: '2026-07-23T12:00:00.000Z',
				subjectCount: 1,
				sessionCount: 1,
			});

		const replace = mock(() => undefined);
		const open = mock(() => ({ closed: false, location: { replace } }));
		(globalThis as { window?: { open: typeof open } }).window = { open };

		await expect(downloadClassLogbook({
			classGroupId: 'cg-1',
			academicPeriodId: 'ci-2025-t1',
		})).resolves.toEqual({ status: 'ready', fileName: 'cahier.pdf' });

		expect(renderClassLogbook).toHaveBeenCalledTimes(2);
		expect(renderClassLogbook.mock.calls[0]?.[0]).toMatchObject({ academicPeriodId: 'ci-2025-t1' });
		expect(renderClassLogbook.mock.calls[1]?.[0]).not.toHaveProperty('academicPeriodId');
	});

	test('maps LOGBOOK_EMPTY to empty status', async () => {
		renderClassLogbook.mockRejectedValueOnce(new ApiError(409, {
			message: 'empty',
			code: 'LOGBOOK_EMPTY',
		}));
		const close = mock(() => undefined);
		const open = mock(() => ({ closed: false, location: { replace: mock(() => undefined) }, close }));
		(globalThis as { window?: { open: typeof open } }).window = { open };

		await expect(downloadClassLogbook({ classGroupId: 'cg-1' }))
			.resolves
			.toEqual({ status: 'empty' });
		expect(close).toHaveBeenCalled();
	});
});
