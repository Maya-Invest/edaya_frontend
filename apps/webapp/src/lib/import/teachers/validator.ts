import type {
	TeacherImportColumnKey,
	TeacherImportRow,
	TeacherImportValidationContext,
	TeacherImportValidationIssue,
	TeacherImportValidationResult,
	ValidatedTeacherImportRow,
} from './types';
import { canImportValidatedRows } from '$lib/import/shared/can-import-validated-rows';
import { normalizeImportCode } from '$lib/import/shared/normalize-import-code';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@][^\s.@]*\.[^\s@]+$/;

function normalizeLookupValue(value: string): string {
	return value.trim().toLowerCase();
}

function issue(
	input: Omit<TeacherImportValidationIssue, 'severity'> & { severity?: TeacherImportValidationIssue['severity'] },
): TeacherImportValidationIssue {
	return {
		...input,
		severity: input.severity ?? 'error',
	};
}

function validateRequiredField(
	row: TeacherImportRow,
	column: TeacherImportColumnKey,
	value: string,
	issues: TeacherImportValidationIssue[],
): boolean {
	if (value.trim().length > 0) {
		return true;
	}
	issues.push(issue({
		rowIndex: row.rowIndex,
		column,
		messageKey: 'import.teachers.validation.required',
	}));
	return false;
}

export function validateTeacherImportRows(
	rows: readonly TeacherImportRow[],
	context: TeacherImportValidationContext = {},
): TeacherImportValidationResult {
	const errors: TeacherImportValidationIssue[] = [];
	const warnings: TeacherImportValidationIssue[] = [];
	const validRows: ValidatedTeacherImportRow[] = [];
	const codesInFile = new Map<string, number>();
	const emailsInFile = new Map<string, number>();

	for (const row of rows) {
		const rowIssues: TeacherImportValidationIssue[] = [];

		const hasCode = validateRequiredField(row, 'code', row.code, rowIssues);
		const hasPrenom = validateRequiredField(row, 'prenom', row.prenom, rowIssues);
		const hasNom = validateRequiredField(row, 'nom', row.nom, rowIssues);

		if (hasCode) {
			const normalizedCode = normalizeImportCode(row.code);
			const previousRow = codesInFile.get(normalizedCode);
			if (previousRow != null) {
				rowIssues.push(issue({
					rowIndex: row.rowIndex,
					column: 'code',
					value: row.code,
					messageKey: 'import.teachers.validation.duplicateCodeInFile',
					messageParams: { row: previousRow },
				}));
			}
			else {
				codesInFile.set(normalizedCode, row.rowIndex);
			}

			if (context.existingCodes?.has(normalizedCode)) {
				rowIssues.push(issue({
					rowIndex: row.rowIndex,
					column: 'code',
					value: row.code,
					messageKey: 'import.teachers.validation.duplicateCodeExisting',
				}));
			}
		}

		if (row.email?.trim()) {
			if (!EMAIL_PATTERN.test(row.email.trim())) {
				rowIssues.push(issue({
					rowIndex: row.rowIndex,
					column: 'email',
					value: row.email,
					messageKey: 'import.teachers.validation.invalidEmail',
					severity: 'warning',
				}));
			}
			else {
				const normalizedEmail = normalizeLookupValue(row.email);
				const previousRow = emailsInFile.get(normalizedEmail);
				if (previousRow != null) {
					rowIssues.push(issue({
						rowIndex: row.rowIndex,
						column: 'email',
						value: row.email,
						messageKey: 'import.teachers.validation.duplicateEmailInFile',
						messageParams: { row: previousRow },
					}));
				}
				else {
					emailsInFile.set(normalizedEmail, row.rowIndex);
				}
			}
		}

		const blockingIssues = rowIssues.filter(entry => entry.severity === 'error');
		for (const rowIssue of rowIssues) {
			if (rowIssue.severity === 'warning') {
				warnings.push(rowIssue);
			}
			else {
				errors.push(rowIssue);
			}
		}

		if (blockingIssues.length === 0 && hasCode && hasPrenom && hasNom) {
			validRows.push({ ...row });
		}
	}

	return { validRows, errors, warnings };
}

export function canImportValidatedTeachers(result: TeacherImportValidationResult | null): boolean {
	return canImportValidatedRows(result);
}
