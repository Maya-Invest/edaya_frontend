import type { ImportTypeDefinition } from '$lib/import/catalog/types';
import type { ImportMultiValueSeparator } from '$lib/import/preferences/import-preferences.svelte';
import { sortImportColumnsRequiredFirst } from '$lib/import/shared/sort-import-columns';
import { downloadCsv } from '$lib/list/list-csv-export';
import * as XLSX from 'xlsx';

export interface ImportTemplateDownloadOptions {
	multiValueSeparator?: ImportMultiValueSeparator;
}

function downloadBlob(filename: string, blob: Blob): void {
	const href = URL.createObjectURL(blob);
	const link = document.createElement('a');
	link.href = href;
	link.download = filename;
	link.click();
	URL.revokeObjectURL(href);
}

function formatExampleCell(
	column: ImportTypeDefinition['columns'][number],
	raw: string,
	separator: ImportMultiValueSeparator,
): string {
	if (!column.multiValue || (!raw.includes(';') && !raw.includes('&'))) {
		return raw;
	}
	const normalized = raw.replaceAll(';', separator).replaceAll('&', separator);
	return normalized;
}

export function buildImportTemplateRows(
	definition: ImportTypeDefinition,
	options: ImportTemplateDownloadOptions = {},
): string[][] {
	const separator = options.multiValueSeparator ?? ';';
	const columns = sortImportColumnsRequiredFirst(definition.columns);
	const headers = columns.map(column => column.key);
	const example = columns.map(column => {
		const raw = definition.exampleRow[column.key] ?? '';
		return formatExampleCell(column, raw, separator);
	});
	return [headers, example];
}

export function downloadImportCsvTemplate(
	definition: ImportTypeDefinition,
	options: ImportTemplateDownloadOptions = {},
): void {
	if (definition.downloadCsvTemplate) {
		definition.downloadCsvTemplate();
		return;
	}
	downloadCsv(definition.csvFilename, buildImportTemplateRows(definition, options));
}

export function downloadImportExcelTemplate(
	definition: ImportTypeDefinition,
	options: ImportTemplateDownloadOptions = {},
): void {
	if (definition.downloadExcelTemplate) {
		definition.downloadExcelTemplate();
		return;
	}
	const workbook = XLSX.utils.book_new();
	const sheet = XLSX.utils.aoa_to_sheet(buildImportTemplateRows(definition, options));
	XLSX.utils.book_append_sheet(workbook, sheet, definition.xlsxSheetName);
	const buffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
	const blob = new Blob(
		[buffer],
		{ type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' },
	);
	downloadBlob(definition.xlsxFilename, blob);
}

