import type { StaffImportColumnKey, StaffImportRow } from './types';
import { isStudentImportFile, isStudentImportFileWithinSizeLimit } from '$lib/import/shared/file-accept';
import { normalizeHeader } from '$lib/import/shared/normalize-header';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import { STAFF_IMPORT_COLUMNS } from './types';

export type StaffImportFileFormat = 'csv' | 'xlsx';

export interface StaffImportParseError {
	message: string;
	rowIndex?: number;
}

export interface StaffImportParseResult {
	rows: StaffImportRow[];
	errors: StaffImportParseError[];
}

function cellToString(value: unknown): string {
	if (value == null) {
		return '';
	}
	return String(value).trim();
}

function isBlankRow(values: Record<StaffImportColumnKey, string>): boolean {
	return STAFF_IMPORT_COLUMNS.every(column => values[column.key].length === 0);
}

function mapRecordToStaffImportRow(
	record: Record<string, unknown>,
	rowIndex: number,
): StaffImportRow | null {
	const values = Object.fromEntries(
		STAFF_IMPORT_COLUMNS.map(column => [column.key, cellToString(record[column.key])]),
	) as Record<StaffImportColumnKey, string>;

	if (isBlankRow(values)) {
		return null;
	}

	return {
		rowIndex,
		prenom: values.prenom,
		nom: values.nom,
		role: values.role,
		...(values.email ? { email: values.email } : {}),
		...(values.telephone ? { telephone: values.telephone } : {}),
	};
}

function normalizeRecordKeys(record: Record<string, unknown>): Record<string, unknown> {
	const normalized: Record<string, unknown> = {};
	for (const [key, value] of Object.entries(record)) {
		normalized[normalizeHeader(key)] = value;
	}
	return normalized;
}

function recordsToStaffImportRows(records: Record<string, unknown>[], headerRowIndex = 1): StaffImportParseResult {
	const rows: StaffImportRow[] = [];
	const errors: StaffImportParseError[] = [];

	for (const [index, record] of records.entries()) {
		const rowIndex = headerRowIndex + index + 1;
		try {
			const mapped = mapRecordToStaffImportRow(normalizeRecordKeys(record), rowIndex);
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

export function detectStaffImportFileFormat(file: Pick<File, 'name' | 'type'>): StaffImportFileFormat | null {
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

export function parseStaffImportCsvText(csvText: string): StaffImportParseResult {
	if (csvText.trim().length === 0) {
		return { rows: [], errors: [{ message: 'empty_file' }] };
	}

	const parsed = Papa.parse<Record<string, unknown>>(csvText, {
		header: true,
		skipEmptyLines: 'greedy',
		transformHeader: normalizeHeader,
	});

	const errors: StaffImportParseError[] = parsed.errors.map(error => ({
		rowIndex: typeof error.row === 'number' ? error.row + 1 : undefined,
		message: error.message,
	}));

	const result = recordsToStaffImportRows(parsed.data);
	return {
		rows: result.rows,
		errors: [...errors, ...result.errors],
	};
}

export function parseStaffImportXlsxBuffer(buffer: ArrayBuffer): StaffImportParseResult {
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

	return recordsToStaffImportRows(records);
}

function validateImportFile(file: File): StaffImportParseError | null {
	if (!isStudentImportFile(file)) {
		return { message: 'unsupported_format' };
	}
	if (!isStudentImportFileWithinSizeLimit(file)) {
		return { message: 'file_too_large' };
	}
	if (detectStaffImportFileFormat(file) == null) {
		return { message: 'unsupported_format' };
	}
	return null;
}

export async function parseStaffImportFile(file: File): Promise<StaffImportParseResult> {
	const validationError = validateImportFile(file);
	if (validationError) {
		return { rows: [], errors: [validationError] };
	}

	const format = detectStaffImportFileFormat(file);
	if (format === 'csv') {
		const csvText = await file.text();
		if (csvText.trim().length === 0) {
			return { rows: [], errors: [{ message: 'empty_file' }] };
		}
		return parseStaffImportCsvText(csvText);
	}

	if (format === 'xlsx') {
		const buffer = await file.arrayBuffer();
		return parseStaffImportXlsxBuffer(buffer);
	}

	return { rows: [], errors: [{ message: 'unsupported_format' }] };
}

/** Test helper to build an in-memory workbook buffer. */
export function buildStaffImportXlsxBufferFromRows(rows: (string | number)[][]): ArrayBuffer {
	const workbook = XLSX.utils.book_new();
	const sheet = XLSX.utils.aoa_to_sheet(rows);
	XLSX.utils.book_append_sheet(workbook, sheet, 'Personnel');
	return XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
}
