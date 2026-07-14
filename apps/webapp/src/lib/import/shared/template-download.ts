import type { ImportTypeDefinition } from '$lib/import/catalog/types';
import { sortImportColumnsRequiredFirst } from '$lib/import/shared/sort-import-columns';
import { downloadCsv } from '$lib/list/list-csv-export';
import * as XLSX from 'xlsx';

function downloadBlob(filename: string, blob: Blob): void {
	const href = URL.createObjectURL(blob);
	const link = document.createElement('a');
	link.href = href;
	link.download = filename;
	link.click();
	URL.revokeObjectURL(href);
}

export function buildImportTemplateRows(definition: ImportTypeDefinition): string[][] {
	const columns = sortImportColumnsRequiredFirst(definition.columns);
	const headers = columns.map(column => column.key);
	const example = columns.map(column => definition.exampleRow[column.key] ?? '');
	return [headers, example];
}

export function downloadImportCsvTemplate(definition: ImportTypeDefinition): void {
	if (definition.downloadCsvTemplate) {
		definition.downloadCsvTemplate();
		return;
	}
	downloadCsv(definition.csvFilename, buildImportTemplateRows(definition));
}

export function downloadImportExcelTemplate(definition: ImportTypeDefinition): void {
	if (definition.downloadExcelTemplate) {
		definition.downloadExcelTemplate();
		return;
	}
	const workbook = XLSX.utils.book_new();
	const sheet = XLSX.utils.aoa_to_sheet(buildImportTemplateRows(definition));
	XLSX.utils.book_append_sheet(workbook, sheet, definition.xlsxSheetName);
	const buffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
	const blob = new Blob(
		[buffer],
		{ type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' },
	);
	downloadBlob(definition.xlsxFilename, blob);
}
