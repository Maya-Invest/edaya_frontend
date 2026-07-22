import type { TeacherImportColumnKey, TeacherImportRow } from './types';
import { isStudentImportFile, isStudentImportFileWithinSizeLimit } from '$lib/import/shared/file-accept';
import { normalizeHeader } from '$lib/import/shared/normalize-header';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import { TEACHER_IMPORT_COLUMNS } from './types';

export type TeacherImportFileFormat = 'csv' | 'xlsx';

export interface TeacherImportParseError {
	message: string;
	rowIndex?: number;
}

export interface TeacherImportParseResult {
	rows: TeacherImportRow[];
	errors: TeacherImportParseError[];
}

function cellToString(value: unknown): string {
	if (value == null) {
		return '';
	}
	return String(value).trim();
}

function isBlankRow(values: Record<TeacherImportColumnKey, string>): boolean {
	return TEACHER_IMPORT_COLUMNS.every(column => values[column.key].length === 0);
}

function mapRecordToTeacherImportRow(
	record: Record<string, unknown>,
	rowIndex: number,
): TeacherImportRow | null {
	const values = Object.fromEntries(
		TEACHER_IMPORT_COLUMNS.map(column => [column.key, cellToString(record[column.key])]),
	) as Record<TeacherImportColumnKey, string>;

	if (isBlankRow(values)) {
		return null;
	}

	return {
		rowIndex,
		prenom: values.prenom,
		nom: values.nom,
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

function recordsToTeacherImportRows(records: Record<string, unknown>[], headerRowIndex = 1): TeacherImportParseResult {
	const rows: TeacherImportRow[] = [];
	const errors: TeacherImportParseError[] = [];

	for (const [index, record] of records.entries()) {
		const rowIndex = headerRowIndex + index + 1;
		try {
			const mapped = mapRecordToTeacherImportRow(normalizeRecordKeys(record), rowIndex);
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

export function detectTeacherImportFileFormat(file: Pick<File, 'name' | 'type'>): TeacherImportFileFormat | null {
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

export function parseTeacherImportCsvText(csvText: string): TeacherImportParseResult {
	if (csvText.trim().length === 0) {
		return { rows: [], errors: [{ message: 'empty_file' }] };
	}

	const parsed = Papa.parse<Record<string, unknown>>(csvText, {
		header: true,
		skipEmptyLines: 'greedy',
		transformHeader: normalizeHeader,
	});

	const errors: TeacherImportParseError[] = parsed.errors.map(error => ({
		rowIndex: typeof error.row === 'number' ? error.row + 1 : undefined,
		message: error.message,
	}));

	const result = recordsToTeacherImportRows(parsed.data);
	return {
		rows: result.rows,
		errors: [...errors, ...result.errors],
	};
}

export function parseTeacherImportXlsxBuffer(buffer: ArrayBuffer): TeacherImportParseResult {
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

	return recordsToTeacherImportRows(records);
}

function validateImportFile(file: File): TeacherImportParseError | null {
	if (!isStudentImportFile(file)) {
		return { message: 'unsupported_format' };
	}
	if (!isStudentImportFileWithinSizeLimit(file)) {
		return { message: 'file_too_large' };
	}
	if (detectTeacherImportFileFormat(file) == null) {
		return { message: 'unsupported_format' };
	}
	return null;
}

export async function parseTeacherImportFile(file: File): Promise<TeacherImportParseResult> {
	const validationError = validateImportFile(file);
	if (validationError) {
		return { rows: [], errors: [validationError] };
	}

	const format = detectTeacherImportFileFormat(file);
	if (format === 'csv') {
		const csvText = await file.text();
		if (csvText.trim().length === 0) {
			return { rows: [], errors: [{ message: 'empty_file' }] };
		}
		return parseTeacherImportCsvText(csvText);
	}

	if (format === 'xlsx') {
		const buffer = await file.arrayBuffer();
		return parseTeacherImportXlsxBuffer(buffer);
	}

	return { rows: [], errors: [{ message: 'unsupported_format' }] };
}

/** Test helper to build an in-memory workbook buffer. */
export function buildTeacherImportXlsxBufferFromRows(rows: (string | number)[][]): ArrayBuffer {
	const workbook = XLSX.utils.book_new();
	const sheet = XLSX.utils.aoa_to_sheet(rows);
	XLSX.utils.book_append_sheet(workbook, sheet, 'Enseignants');
	return XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
}
