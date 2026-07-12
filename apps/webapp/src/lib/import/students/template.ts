import type { StudentImportColumnKey } from './types';
import { sortImportColumnsRequiredFirst } from '$lib/import/shared/sort-import-columns';
import { downloadCsv } from '$lib/list/list-csv-export';
import * as XLSX from 'xlsx';
import { STUDENT_IMPORT_COLUMNS } from './types';

export const STUDENT_IMPORT_CSV_TEMPLATE_FILENAME = 'eleves-template.csv';
export const STUDENT_IMPORT_EXCEL_TEMPLATE_FILENAME = 'eleves-template.xlsx';

/** @deprecated Use STUDENT_IMPORT_CSV_TEMPLATE_FILENAME */
export const STUDENT_IMPORT_TEMPLATE_FILENAME = STUDENT_IMPORT_CSV_TEMPLATE_FILENAME;

export const STUDENT_IMPORT_EXAMPLE_ROW: Record<StudentImportColumnKey, string> = {
	prenom: 'Jean',
	nom: 'Dupont',
	classe: '6ème A',
	date_naissance: '2012-03-15',
	genre: 'M',
	matricule: 'MAT-2024-001',
};

export function buildStudentImportTemplateRows(): string[][] {
	const columns = sortImportColumnsRequiredFirst(STUDENT_IMPORT_COLUMNS);
	const headers = columns.map(column => column.key);
	const example = columns.map(column => STUDENT_IMPORT_EXAMPLE_ROW[column.key]);
	return [headers, example];
}

function downloadBlob(filename: string, blob: Blob): void {
	const href = URL.createObjectURL(blob);
	const link = document.createElement('a');
	link.href = href;
	link.download = filename;
	link.click();
	URL.revokeObjectURL(href);
}

export function buildStudentImportExcelWorkbook(): XLSX.WorkBook {
	const workbook = XLSX.utils.book_new();
	const sheet = XLSX.utils.aoa_to_sheet(buildStudentImportTemplateRows());
	XLSX.utils.book_append_sheet(workbook, sheet, 'Eleves');
	return workbook;
}

export function downloadStudentImportCsvTemplate(): void {
	downloadCsv(STUDENT_IMPORT_CSV_TEMPLATE_FILENAME, buildStudentImportTemplateRows());
}

export function downloadStudentImportExcelTemplate(): void {
	const workbook = buildStudentImportExcelWorkbook();
	const buffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
	const blob = new Blob(
		[buffer],
		{ type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' },
	);
	downloadBlob(STUDENT_IMPORT_EXCEL_TEMPLATE_FILENAME, blob);
}

/** @deprecated Use downloadStudentImportCsvTemplate */
export function downloadStudentImportTemplate(): void {
	downloadStudentImportCsvTemplate();
}
