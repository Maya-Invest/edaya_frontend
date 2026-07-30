import type { ImportReportRowOutcome, ImportReportRowStatus } from './import-report-status';
import { downloadCsv } from '$lib/list/list-csv-export';

export interface ImportReportDownloadLabels {
	statusHeader: string;
	messageHeader: string;
	success: string;
	warning: string;
	error: string;
}

export interface ImportReportDownloadInput {
	columnKeys: readonly string[];
	rows: readonly { rowIndex: number }[];
	getColumnValue: (row: { rowIndex: number }, key: string) => string;
	statusByRowIndex: ReadonlyMap<number, ImportReportRowOutcome>;
	labels: ImportReportDownloadLabels;
	filenameBase: string;
}

interface ExcelCellStyle {
	fill: { type: 'pattern'; pattern: 'solid'; fgColor: { argb: string } };
	font: { color: { argb: string }; bold?: boolean };
}

const STATUS_CELL_STYLE: Record<ImportReportRowStatus, ExcelCellStyle> = {
	success: {
		fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD1FAE5' } },
		font: { color: { argb: 'FF065F46' }, bold: true },
	},
	warning: {
		fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFEF3C7' } },
		font: { color: { argb: 'FF92400E' }, bold: true },
	},
	error: {
		fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFEE2E2' } },
		font: { color: { argb: 'FFB91C1C' }, bold: true },
	},
};

function downloadBlob(filename: string, blob: Blob): void {
	const href = URL.createObjectURL(blob);
	const link = document.createElement('a');
	link.href = href;
	link.download = filename;
	link.click();
	URL.revokeObjectURL(href);
}

function statusLabel(status: ImportReportRowStatus, labels: ImportReportDownloadLabels): string {
	if (status === 'warning') {
		return labels.warning;
	}
	if (status === 'error') {
		return labels.error;
	}
	return labels.success;
}

/** Keep only blocking error rows for the downloadable error report. */
export function filterImportReportErrorRows<T extends { rowIndex: number }>(
	rows: readonly T[],
	statusByRowIndex: ReadonlyMap<number, ImportReportRowOutcome>,
): T[] {
	return rows.filter(row => statusByRowIndex.get(row.rowIndex)?.status === 'error');
}

function buildReportMatrix(input: ImportReportDownloadInput): string[][] {
	const header = [
		...input.columnKeys,
		input.labels.statusHeader,
		input.labels.messageHeader,
	];
	const body = input.rows.map((row) => {
		const outcome = input.statusByRowIndex.get(row.rowIndex) ?? {
			status: 'error' as const,
			messages: [],
		};
		return [
			...input.columnKeys.map(key => input.getColumnValue(row, key)),
			statusLabel(outcome.status, input.labels),
			outcome.messages.join(' | '),
		];
	});
	return [header, ...body];
}

export function downloadImportReportCsv(input: ImportReportDownloadInput): void {
	downloadCsv(`${input.filenameBase}-erreurs.csv`, buildReportMatrix(input));
}

export async function downloadImportReportExcel(input: ImportReportDownloadInput): Promise<void> {
	const ExcelJS = (await import('exceljs')).default;
	const workbook = new ExcelJS.Workbook();
	const sheet = workbook.addWorksheet('Erreurs');
	const matrix = buildReportMatrix(input);
	const statusColumnIndex = input.columnKeys.length + 1;
	const messageColumnIndex = input.columnKeys.length + 2;

	for (const [rowIndex, rowValues] of matrix.entries()) {
		const row = sheet.addRow(rowValues);
		if (rowIndex === 0) {
			row.font = { bold: true };
			continue;
		}

		const sourceRow = input.rows[rowIndex - 1];
		const outcome = sourceRow
			? input.statusByRowIndex.get(sourceRow.rowIndex)
			: undefined;
		const status = outcome?.status ?? 'error';
		const style = STATUS_CELL_STYLE[status];

		const statusCell = row.getCell(statusColumnIndex);
		statusCell.fill = style.fill;
		statusCell.font = style.font;

		const messageCell = row.getCell(messageColumnIndex);
		messageCell.font = { color: style.font.color };
	}

	const buffer = await workbook.xlsx.writeBuffer();
	const blob = new Blob(
		[buffer],
		{ type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' },
	);
	downloadBlob(`${input.filenameBase}-erreurs.xlsx`, blob);
}
