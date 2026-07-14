export const STUDENT_IMPORT_MAX_FILE_BYTES = 5 * 1024 * 1024;

export const STUDENT_IMPORT_ACCEPT = '.csv,.xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/csv';

export const STUDENT_IMPORT_EXTENSIONS = ['.csv', '.xlsx'] as const;

export type StudentImportFileExtension = (typeof STUDENT_IMPORT_EXTENSIONS)[number];

export function isStudentImportFileExtension(value: string): value is StudentImportFileExtension {
	const lower = value.toLowerCase();
	return STUDENT_IMPORT_EXTENSIONS.some(extension => lower.endsWith(extension));
}

export function isStudentImportFile(file: File): boolean {
	return isStudentImportFileExtension(file.name);
}

export function isStudentImportFileWithinSizeLimit(file: File, maxBytes = STUDENT_IMPORT_MAX_FILE_BYTES): boolean {
	return file.size > 0 && file.size <= maxBytes;
}
