import type { ImportTypeDefinition } from '$lib/import/catalog/types';
import type { ImportMultiValueSeparator } from '$lib/import/preferences/import-preferences.svelte';
import { mapStaffImportRoleToProfileRole } from '$lib/import/staff/staff-role-labels';
import { sortImportColumnsRequiredFirst } from '$lib/import/shared/sort-import-columns';
import { catalogCycle, catalogText } from '$lib/i18n/catalog-label';
import { dictionaries } from '$lib/i18n/dictionaries';
import { lang } from '$lib/i18n';
import { downloadCsv } from '$lib/list/list-csv-export';
import { get } from 'svelte/store';
import * as XLSX from 'xlsx';

const IMPORT_SHEET_NAME_EN: Record<string, string> = {
	Eleves: 'Students',
	Tuteurs: 'Guardians',
	Personnel: 'Staff',
	Enseignants: 'Teachers',
	Classes: 'Classes',
	Matieres: 'Subjects',
	Affectations: 'Assignments',
	Chapitres: 'Chapters',
	Facturation: 'Billing',
	Paiements: 'Payments',
};

const IMPORT_FEE_TYPE_EN: Record<string, string> = {
	'Scolarité — Collège': 'Tuition — Lower secondary',
	'Scolarité — Lycée': 'Tuition — Upper secondary',
};

export function localizedImportSheetName(frName: string): string {
	if (get(lang) !== 'en') {
		return frName;
	}
	return IMPORT_SHEET_NAME_EN[frName] ?? frName;
}

export function localizeImportExampleCell(columnKey: string, raw: string): string {
	if (!raw) {
		return raw;
	}

	const current = get(lang);
	if (columnKey === 'role') {
		const role = mapStaffImportRoleToProfileRole(raw);
		if (role) {
			return dictionaries[current][`staff.role.${role}`] ?? raw;
		}
	}

	if (columnKey === 'type_frais') {
		if (current === 'en' && IMPORT_FEE_TYPE_EN[raw]) {
			return IMPORT_FEE_TYPE_EN[raw];
		}
		return raw.replace(/\b(Collège|College|Lycée|Lycee)\b/g, match => catalogCycle(match, current));
	}

	return catalogText(raw, current);
}

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
	const example = columns.map((column) => {
		const raw = localizeImportExampleCell(column.key, definition.exampleRow[column.key] ?? '');
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
	XLSX.utils.book_append_sheet(
		workbook,
		sheet,
		localizedImportSheetName(definition.xlsxSheetName),
	);
	const buffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
	const blob = new Blob(
		[buffer],
		{ type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' },
	);
	downloadBlob(definition.xlsxFilename, blob);
}
