import { describe, expect, it } from 'bun:test';
import { filterImportReportErrorRows } from '$lib/import/shared/import-report-download';
import type { ImportReportRowOutcome } from '$lib/import/shared/import-report-status';

describe('filterImportReportErrorRows', () => {
	it('keeps only rows marked as error', () => {
		const rows = [
			{ rowIndex: 2, matricule: 'OK-1' },
			{ rowIndex: 3, matricule: 'ERR-1' },
			{ rowIndex: 4, matricule: 'WARN-1' },
		];
		const statusByRowIndex = new Map<number, ImportReportRowOutcome>([
			[2, { status: 'success', messages: [] }],
			[3, { status: 'error', messages: ['Classe introuvable'] }],
			[4, { status: 'warning', messages: ['Sans classe'] }],
		]);

		expect(filterImportReportErrorRows(rows, statusByRowIndex)).toEqual([
			{ rowIndex: 3, matricule: 'ERR-1' },
		]);
	});
});
