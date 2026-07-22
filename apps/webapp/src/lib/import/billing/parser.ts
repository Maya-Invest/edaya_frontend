import type { BillingImportColumnKey, BillingImportRow } from './types';
import { isStudentImportFile, isStudentImportFileWithinSizeLimit } from '$lib/import/shared/file-accept';
import { normalizeHeader } from '$lib/import/shared/normalize-header';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import { BILLING_IMPORT_COLUMNS } from './types';

export type BillingImportFileFormat = 'csv' | 'xlsx';

export interface BillingImportParseError {
	message: string;
	rowIndex?: number;
}

export interface BillingImportParseResult {
	rows: BillingImportRow[];
	errors: BillingImportParseError[];
}

function cellToString(value: unknown): string {
	if (value == null) {
		return '';
	}
	return String(value).trim();
}

function isBlankRow(values: Record<BillingImportColumnKey, string>): boolean {
	return BILLING_IMPORT_COLUMNS.every(column => values[column.key].length === 0);
}

function mapRecordToBillingImportRow(
	record: Record<string, unknown>,
	rowIndex: number,
): BillingImportRow | null {
	const values = Object.fromEntries(
		BILLING_IMPORT_COLUMNS.map(column => [column.key, cellToString(record[column.key])]),
	) as Record<BillingImportColumnKey, string>;

	if (isBlankRow(values)) {
		return null;
	}

	return {
		rowIndex,
		matricule: values.matricule,
		type_frais: values.type_frais,
		...(values.montant ? { montant: values.montant } : {}),
		...(values.date_echeance ? { date_echeance: values.date_echeance } : {}),
	};
}

function normalizeRecordKeys(record: Record<string, unknown>): Record<string, unknown> {
	const normalized: Record<string, unknown> = {};
	for (const [key, value] of Object.entries(record)) {
		normalized[normalizeHeader(key)] = value;
	}
	return normalized;
}

function recordsToBillingImportRows(records: Record<string, unknown>[], headerRowIndex = 1): BillingImportParseResult {
	const rows: BillingImportRow[] = [];
	const errors: BillingImportParseError[] = [];

	for (const [index, record] of records.entries()) {
		const rowIndex = headerRowIndex + index + 1;
		try {
			const mapped = mapRecordToBillingImportRow(normalizeRecordKeys(record), rowIndex);
			if (mapped) {
				rows.push(mapped);
			}
		}
		catch (error) {
			errors.push({
				rowIndex,
				message: error instanceof Error ? error.message : 'Invalid row',
			});
		}
	}

	return { rows, errors };
}

export function detectBillingImportFileFormat(file: Pick<File, 'name' | 'type'>): BillingImportFileFormat | null {
	const lowerName = file.name.toLowerCase();
	if (lowerName.endsWith('.csv') || file.type === 'text/csv') {
		return 'csv';
	}
	if (
		lowerName.endsWith('.xlsx')
		|| file.type === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
	) {
		return 'xlsx';
	}
	return null;
}

export function parseBillingImportCsvText(csvText: string): BillingImportParseResult {
	if (csvText.trim().length === 0) {
		return { rows: [], errors: [{ message: 'empty_file' }] };
	}

	const parsed = Papa.parse<Record<string, unknown>>(csvText, {
		header: true,
		skipEmptyLines: 'greedy',
		transformHeader: normalizeHeader,
	});

	const errors: BillingImportParseError[] = parsed.errors.map(error => ({
		rowIndex: typeof error.row === 'number' ? error.row + 1 : undefined,
		message: error.message,
	}));

	const result = recordsToBillingImportRows(parsed.data);
	return {
		rows: result.rows,
		errors: [...errors, ...result.errors],
	};
}

export function parseBillingImportXlsxBuffer(buffer: ArrayBuffer): BillingImportParseResult {
	const workbook = XLSX.read(buffer, { type: 'array', cellDates: true });
	const sheetName = workbook.SheetNames[0];
	if (!sheetName) {
		return { rows: [], errors: [{ message: 'empty_file' }] };
	}

	const sheet = workbook.Sheets[sheetName];
	const matrix = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, defval: '' });
	if (matrix.length === 0) {
		return { rows: [], errors: [{ message: 'empty_file' }] };
	}

	const [headerRow, ...dataRows] = matrix;
	const headers = (headerRow ?? []).map(value => normalizeHeader(cellToString(value)));
	const records = dataRows.map((row) => {
		const record: Record<string, unknown> = {};
		for (const [index, header] of headers.entries()) {
			if (!header) {
				continue;
			}
			record[header] = Array.isArray(row) ? cellToString(row[index]) : '';
		}
		return record;
	});

	return recordsToBillingImportRows(records);
}

function validateImportFile(file: File): BillingImportParseError | null {
	if (!isStudentImportFile(file)) {
		return { message: 'unsupported_format' };
	}
	if (!isStudentImportFileWithinSizeLimit(file)) {
		return { message: 'file_too_large' };
	}
	if (detectBillingImportFileFormat(file) == null) {
		return { message: 'unsupported_format' };
	}
	return null;
}

export async function parseBillingImportFile(file: File): Promise<BillingImportParseResult> {
	const validationError = validateImportFile(file);
	if (validationError) {
		return { rows: [], errors: [validationError] };
	}

	const format = detectBillingImportFileFormat(file);
	if (format === 'csv') {
		const csvText = await file.text();
		if (csvText.trim().length === 0) {
			return { rows: [], errors: [{ message: 'empty_file' }] };
		}
		return parseBillingImportCsvText(csvText);
	}

	if (format === 'xlsx') {
		const buffer = await file.arrayBuffer();
		return parseBillingImportXlsxBuffer(buffer);
	}

	return { rows: [], errors: [{ message: 'unsupported_format' }] };
}

export function buildBillingImportXlsxBufferFromRows(rows: (string | number)[][]): ArrayBuffer {
	const workbook = XLSX.utils.book_new();
	const sheet = XLSX.utils.aoa_to_sheet(rows);
	XLSX.utils.book_append_sheet(workbook, sheet, 'Facturation');
	return XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
}
