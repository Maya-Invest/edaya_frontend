import type { ClassImportColumnKey, ClassImportRow } from './types';
import { isStudentImportFile, isStudentImportFileWithinSizeLimit } from '$lib/import/shared/file-accept';
import { normalizeHeader } from '$lib/import/shared/normalize-header';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import { CLASS_IMPORT_COLUMNS } from './types';

export type ClassImportFileFormat = 'csv' | 'xlsx';

export interface ClassImportParseError {
	message: string;
	rowIndex?: number;
}

export interface ClassImportParseResult {
	rows: ClassImportRow[];
	errors: ClassImportParseError[];
}

function cellToString(value: unknown): string {
	if (value == null) {
		return '';
	}
	if (value instanceof Date) {
		return value.toISOString().slice(0, 10);
	}
	return String(value).trim();
}

function isBlankRow(values: Record<ClassImportColumnKey, string>): boolean {
	return CLASS_IMPORT_COLUMNS.every(column => values[column.key].length === 0);
}

function mapRecordToClassImportRow(
	record: Record<string, unknown>,
	rowIndex: number,
): ClassImportRow | null {
	const values = Object.fromEntries(
		CLASS_IMPORT_COLUMNS.map(column => [column.key, cellToString(record[column.key])]),
	) as Record<ClassImportColumnKey, string>;

	if (isBlankRow(values)) {
		return null;
	}

	return {
		rowIndex,
		nom: values.nom,
		niveau: values.niveau,
		...(values.capacite ? { capacite: values.capacite } : {}),
	};
}

function normalizeRecordKeys(record: Record<string, unknown>): Record<string, unknown> {
	const normalized: Record<string, unknown> = {};
	for (const [key, value] of Object.entries(record)) {
		normalized[normalizeHeader(key)] = value;
	}
	return normalized;
}

function recordsToClassImportRows(records: Record<string, unknown>[], headerRowIndex = 1): ClassImportParseResult {
	const rows: ClassImportRow[] = [];
	const errors: ClassImportParseError[] = [];

	for (const [index, record] of records.entries()) {
		const rowIndex = headerRowIndex + index + 1;
		try {
			const mapped = mapRecordToClassImportRow(normalizeRecordKeys(record), rowIndex);
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

export function detectClassImportFileFormat(file: Pick<File, 'name' | 'type'>): ClassImportFileFormat | null {
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

export function parseClassImportCsvText(csvText: string): ClassImportParseResult {
	if (csvText.trim().length === 0) {
		return { rows: [], errors: [{ message: 'empty_file' }] };
	}

	const parsed = Papa.parse<Record<string, unknown>>(csvText, {
		header: true,
		skipEmptyLines: 'greedy',
		transformHeader: normalizeHeader,
	});

	const errors: ClassImportParseError[] = parsed.errors.map(error => ({
		rowIndex: typeof error.row === 'number' ? error.row + 1 : undefined,
		message: error.message,
	}));

	const result = recordsToClassImportRows(parsed.data);
	return {
		rows: result.rows,
		errors: [...errors, ...result.errors],
	};
}

export function parseClassImportXlsxBuffer(buffer: ArrayBuffer): ClassImportParseResult {
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

	return recordsToClassImportRows(records);
}

function validateImportFile(file: File): ClassImportParseError | null {
	if (!isStudentImportFile(file)) {
		return { message: 'unsupported_format' };
	}
	if (!isStudentImportFileWithinSizeLimit(file)) {
		return { message: 'file_too_large' };
	}
	if (detectClassImportFileFormat(file) == null) {
		return { message: 'unsupported_format' };
	}
	return null;
}

export async function parseClassImportFile(file: File): Promise<ClassImportParseResult> {
	const validationError = validateImportFile(file);
	if (validationError) {
		return { rows: [], errors: [validationError] };
	}

	const format = detectClassImportFileFormat(file);
	if (format === 'csv') {
		const csvText = await file.text();
		if (csvText.trim().length === 0) {
			return { rows: [], errors: [{ message: 'empty_file' }] };
		}
		return parseClassImportCsvText(csvText);
	}

	if (format === 'xlsx') {
		const buffer = await file.arrayBuffer();
		return parseClassImportXlsxBuffer(buffer);
	}

	return { rows: [], errors: [{ message: 'unsupported_format' }] };
}

/** Test helper to build an in-memory workbook buffer. */
export function buildClassImportXlsxBufferFromRows(rows: (string | number)[][]): ArrayBuffer {
	const workbook = XLSX.utils.book_new();
	const sheet = XLSX.utils.aoa_to_sheet(rows);
	XLSX.utils.book_append_sheet(workbook, sheet, 'Classes');
	return XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
}
