import { describe, expect, mock, test } from 'bun:test';

const listAttachments = mock(async () => [] as unknown[]);
const getDownloadUrl = mock(async () => ({ downloadUrl: 'https://files.example/bulletin.pdf' }));

mock.module('$lib/api/school-client', () => ({
	getBrowserSchoolClient: () => ({
		entities: {
			attachments: {
				list: listAttachments,
			},
		},
		files: {
			getDownloadUrl,
		},
	}),
}));

const { lookupReportCardPdf, openReportCardPdf } = await import('$lib/api/report-card-pdf');

describe('report-card-pdf', () => {
	test('lookupReportCardPdf returns ready for a ready PDF attachment', async () => {
		listAttachments.mockImplementationOnce(async () => ([
			{
				id: 'att-1',
				fileName: 'bulletin-ci-rcr-s1-t1.pdf',
				status: 'ready',
				mimeType: 'application/pdf',
			},
		]));

		await expect(lookupReportCardPdf('ci-rcr-s1-t1')).resolves.toEqual({
			status: 'ready',
			attachmentId: 'att-1',
			fileName: 'bulletin-ci-rcr-s1-t1.pdf',
		});
	});

	test('openReportCardPdf opens a download URL when ready', async () => {
		listAttachments.mockImplementation(async () => ([
			{
				id: 'att-2',
				fileName: 'bulletin.pdf',
				status: 'ready',
				mimeType: 'application/pdf',
			},
		]));
		const open = mock(() => null);
		(globalThis as { window?: { open: typeof open } }).window = { open };

		const result = await openReportCardPdf('ci-rcr-s1-t1', { attempts: 1, delayMs: 0 });
		expect(result.status).toBe('ready');
		expect(getDownloadUrl).toHaveBeenCalledWith({ attachmentId: 'att-2' });
		expect(open).toHaveBeenCalledWith(
			'https://files.example/bulletin.pdf',
			'_blank',
			'noopener,noreferrer',
		);
	});
});
