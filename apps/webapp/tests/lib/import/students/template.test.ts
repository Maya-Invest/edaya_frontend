import { describe, expect, it } from 'bun:test';
import * as XLSX from 'xlsx';
import {
	buildStudentImportExcelWorkbook,
	buildStudentImportTemplateRows,
	STUDENT_IMPORT_CSV_TEMPLATE_FILENAME,
	STUDENT_IMPORT_EXAMPLE_ROW,
	STUDENT_IMPORT_EXCEL_TEMPLATE_FILENAME,
} from '$lib/import/students/template';
import { STUDENT_IMPORT_COLUMNS } from '$lib/import/students/types';

describe('student import template', () => {
	it('uses the planned csv filename', () => {
		expect(STUDENT_IMPORT_CSV_TEMPLATE_FILENAME).toBe('eleves-template.csv');
	});

	it('uses the planned excel filename', () => {
		expect(STUDENT_IMPORT_EXCEL_TEMPLATE_FILENAME).toBe('eleves-template.xlsx');
	});

	it('builds header and example rows from column definitions', () => {
		const rows = buildStudentImportTemplateRows();

		expect(rows).toHaveLength(2);
		expect(rows[0]).toEqual(STUDENT_IMPORT_COLUMNS.map(column => column.key));
		expect(rows[1]).toEqual(STUDENT_IMPORT_COLUMNS.map(column => STUDENT_IMPORT_EXAMPLE_ROW[column.key]));
	});

	it('builds an excel workbook with the same template rows', () => {
		const workbook = buildStudentImportExcelWorkbook();
		const buffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'buffer' });
		const parsed = XLSX.read(buffer, { type: 'buffer' });

		expect(parsed.SheetNames).toEqual(['Eleves']);

		const sheet = parsed.Sheets.Eleves;
		const rows = XLSX.utils.sheet_to_json<string[]>(sheet, { header: 1, defval: '' });

		expect(rows).toEqual(buildStudentImportTemplateRows());
	});
});
