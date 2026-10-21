import type { ChapterImportColumnKey, ChapterImportRow } from './types';
import { isStudentImportFile, isStudentImportFileWithinSizeLimit } from '$lib/import/shared/file-accept';
import { normalizeHeader } from '$lib/import/shared/normalize-header';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import { CHAPTER_IMPORT_COLUMNS } from './types';

export type ChapterImportFileFormat = 'csv' | 'xlsx';

export interface ChapterImportParseError {
	message: string;
	rowIndex?: number;
}

export interface ChapterImportParseResult {
	rows: ChapterImportRow[];
	errors: ChapterImportParseError[];
}

function cellToString(value: unknown): string {
	if (value == null) {
		return '';
	}
	return String(value).trim();
}

function isBlankRow(values: Record<ChapterImportColumnKey, string>): boolean {
	return CHAPTER_IMPORT_COLUMNS.every(column => values[column.key].length === 0);
}

function mapRecordToChapterImportRow(
	record: Record<string, unknown>,
	rowIndex: number,
): ChapterImportRow | null {
	const values = Object.fromEntries(
		CHAPTER_IMPORT_COLUMNS.map(column => [column.key, cellToString(record[normalizeHeader(column.key)])]),
	) as Record<ChapterImportColumnKey, string>;

	if (isBlankRow(values)) {
		return null;
	}

	return {
		rowIndex,
		...(values.subjectId ? { subjectId: values.subjectId } : {}),
		niveau: values.niveau,
		matiere: values.matiere,
		titre: values.titre,
		...(values.ordre ? { ordre: values.ordre } : {}),
		...(values.description ? { description: values.description } : {}),
	};
}

function normalizeRecordKeys(record: Record<string, unknown>): Record<string, unknown> {
	const normalized: Record<string, unknown> = {};
	for (const [key, value] of Object.entries(record)) {
		normalized[normalizeHeader(key)] = value;
	}
	return normalized;
}

function recordsToChapterImportRows(records: Record<string, unknown>[], headerRowIndex = 1): ChapterImportParseResult {
	const rows: ChapterImportRow[] = [];
	const errors: ChapterImportParseError[] = [];

	for (const [index, record] of records.entries()) {
		const rowIndex = headerRowIndex + index + 1;
		try {
			const mapped = mapRecordToChapterImportRow(normalizeRecordKeys(record), rowIndex);
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

export function detectChapterImportFileFormat(file: Pick<File, 'name' | 'type'>): ChapterImportFileFormat | null {
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

export function parseChapterImportCsvText(csvText: string): ChapterImportParseResult {
	if (csvText.trim().length === 0) {
		return { rows: [], errors: [{ message: 'empty_file' }] };
	}

	const parsed = Papa.parse<Record<string, unknown>>(csvText, {
		header: true,
		skipEmptyLines: 'greedy',
		transformHeader: normalizeHeader,
	});

	const errors: ChapterImportParseError[] = parsed.errors.map(error => ({
		rowIndex: typeof error.row === 'number' ? error.row + 1 : undefined,
		message: error.message,
	}));

	const result = recordsToChapterImportRows(parsed.data);
	return {
		rows: result.rows,
		errors: [...errors, ...result.errors],
	};
}

export function parseChapterImportXlsxBuffer(buffer: ArrayBuffer): ChapterImportParseResult {
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

	return recordsToChapterImportRows(records);
}

function validateImportFile(file: File): ChapterImportParseError | null {
	if (!isStudentImportFile(file)) {
		return { message: 'unsupported_format' };
	}
	if (!isStudentImportFileWithinSizeLimit(file)) {
		return { message: 'file_too_large' };
	}
	if (detectChapterImportFileFormat(file) == null) {
		return { message: 'unsupported_format' };
	}
	return null;
}

export async function parseChapterImportFile(file: File): Promise<ChapterImportParseResult> {
	const validationError = validateImportFile(file);
	if (validationError) {
		return { rows: [], errors: [validationError] };
	}

	const format = detectChapterImportFileFormat(file);
	if (format === 'csv') {
		const csvText = await file.text();
		if (csvText.trim().length === 0) {
			return { rows: [], errors: [{ message: 'empty_file' }] };
		}
		return parseChapterImportCsvText(csvText);
	}

	if (format === 'xlsx') {
		const buffer = await file.arrayBuffer();
		return parseChapterImportXlsxBuffer(buffer);
	}

	return { rows: [], errors: [{ message: 'unsupported_format' }] };
}

/** Test helper to build an in-memory workbook buffer. */
export function buildChapterImportXlsxBufferFromRows(rows: (string | number)[][]): ArrayBuffer {
	const workbook = XLSX.utils.book_new();
	const sheet = XLSX.utils.aoa_to_sheet(rows);
	XLSX.utils.book_append_sheet(workbook, sheet, 'Chapitres');
	return XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
}
