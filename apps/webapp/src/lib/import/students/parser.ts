import type { StudentImportColumnKey, StudentImportRow } from './types';
import { isStudentImportFile, isStudentImportFileWithinSizeLimit } from '$lib/import/shared/file-accept';
import { normalizeHeader } from '$lib/import/shared/normalize-header';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import { STUDENT_IMPORT_COLUMNS } from './types';

export type StudentImportFileFormat = 'csv' | 'xlsx';

export interface StudentImportParseError {
	message: string;
	rowIndex?: number;
}

export interface StudentImportParseResult {
	rows: StudentImportRow[];
	errors: StudentImportParseError[];
}

function excelSerialToIsoDate(serial: number): string | null {
	if (!Number.isFinite(serial) || serial < 1) {
		return null;
	}
	const parsed = XLSX.SSF.parse_date_code(serial);
	if (!parsed) {
		return null;
	}
	const month = String(parsed.m).padStart(2, '0');
	const day = String(parsed.d).padStart(2, '0');
	return `${parsed.y}-${month}-${day}`;
}

function cellToString(value: unknown): string {
	if (value == null) {
		return '';
	}
	if (value instanceof Date) {
		return value.toISOString().slice(0, 10);
	}
	if (typeof value === 'number' && value >= 20_000 && value <= 60_000) {
		const isoDate = excelSerialToIsoDate(value);
		if (isoDate) {
			return isoDate;
		}
	}
	return String(value).trim();
}

function isBlankRow(values: Record<StudentImportColumnKey, string>): boolean {
	return STUDENT_IMPORT_COLUMNS.every(column => values[column.key].length === 0);
}

function mapRecordToStudentImportRow(
	record: Record<string, unknown>,
	rowIndex: number,
): StudentImportRow | null {
	const values = Object.fromEntries(
		STUDENT_IMPORT_COLUMNS.map(column => [column.key, cellToString(record[column.key])]),
	) as Record<StudentImportColumnKey, string>;

	if (isBlankRow(values)) {
		return null;
	}

	return {
		rowIndex,
		prenom: values.prenom,
		nom: values.nom,
		matricule: values.matricule ?? '',
		classe: values.classe,
		...(values.date_naissance ? { date_naissance: values.date_naissance } : {}),
		...(values.genre ? { genre: values.genre } : {}),
	};
}

function normalizeRecordKeys(record: Record<string, unknown>): Record<string, unknown> {
	const normalized: Record<string, unknown> = {};
	for (const [key, value] of Object.entries(record)) {
		normalized[normalizeHeader(key)] = value;
	}
	return normalized;
}

function recordsToStudentImportRows(records: Record<string, unknown>[], headerRowIndex = 1): StudentImportParseResult {
	const rows: StudentImportRow[] = [];
	const errors: StudentImportParseError[] = [];

	for (const [index, record] of records.entries()) {
		const rowIndex = headerRowIndex + index + 1;
		try {
			const mapped = mapRecordToStudentImportRow(normalizeRecordKeys(record), rowIndex);
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

export function detectStudentImportFileFormat(file: Pick<File, 'name' | 'type'>): StudentImportFileFormat | null {
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

export function parseStudentImportCsvText(csvText: string): StudentImportParseResult {
	if (csvText.trim().length === 0) {
		return { rows: [], errors: [{ message: 'empty_file' }] };
	}

	const parsed = Papa.parse<Record<string, unknown>>(csvText, {
		header: true,
		skipEmptyLines: 'greedy',
		transformHeader: normalizeHeader,
	});

	const errors: StudentImportParseError[] = parsed.errors.map(error => ({
		rowIndex: typeof error.row === 'number' ? error.row + 1 : undefined,
		message: error.message,
	}));

	const result = recordsToStudentImportRows(parsed.data);
	return {
		rows: result.rows,
		errors: [...errors, ...result.errors],
	};
}

export function parseStudentImportXlsxBuffer(buffer: ArrayBuffer): StudentImportParseResult {
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

	return recordsToStudentImportRows(records);
}

function validateImportFile(file: File): StudentImportParseError | null {
	if (!isStudentImportFile(file)) {
		return { message: 'unsupported_format' };
	}
	if (!isStudentImportFileWithinSizeLimit(file)) {
		return { message: 'file_too_large' };
	}
	if (detectStudentImportFileFormat(file) == null) {
		return { message: 'unsupported_format' };
	}
	return null;
}

export async function parseStudentImportFile(file: File): Promise<StudentImportParseResult> {
	const validationError = validateImportFile(file);
	if (validationError) {
		return { rows: [], errors: [validationError] };
	}

	const format = detectStudentImportFileFormat(file);
	if (format === 'csv') {
		const csvText = await file.text();
		if (csvText.trim().length === 0) {
			return { rows: [], errors: [{ message: 'empty_file' }] };
		}
		return parseStudentImportCsvText(csvText);
	}

	if (format === 'xlsx') {
		const buffer = await file.arrayBuffer();
		return parseStudentImportXlsxBuffer(buffer);
	}

	return { rows: [], errors: [{ message: 'unsupported_format' }] };
}

/** Test helper to build an in-memory workbook buffer. */
export function buildStudentImportXlsxBufferFromRows(rows: (string | number)[][]): ArrayBuffer {
	const workbook = XLSX.utils.book_new();
	const sheet = XLSX.utils.aoa_to_sheet(rows);
	XLSX.utils.book_append_sheet(workbook, sheet, 'Eleves');
	return XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
}
