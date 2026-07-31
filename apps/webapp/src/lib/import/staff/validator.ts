import type {
	StaffImportColumnKey,
	StaffImportRow,
	StaffImportValidationContext,
	StaffImportValidationIssue,
	StaffImportValidationResult,
	ValidatedStaffImportRow,
} from './types';
import { canImportValidatedRows } from '$lib/import/shared/can-import-validated-rows';
import { normalizeImportCode } from '$lib/import/shared/normalize-import-code';
import { isKnownStaffImportRole, staffRoleSuggestions } from './staff-role-labels';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@][^\s.@]*\.[^\s@]+$/;

function normalizeLookupValue(value: string): string {
	return value.trim().toLowerCase();
}

function issue(
	input: Omit<StaffImportValidationIssue, 'severity'> & { severity?: StaffImportValidationIssue['severity'] },
): StaffImportValidationIssue {
	return {
		...input,
		severity: input.severity ?? 'error',
	};
}

function validateRequiredField(
	row: StaffImportRow,
	column: StaffImportColumnKey,
	value: string,
	issues: StaffImportValidationIssue[],
): boolean {
	if (value.trim().length > 0) {
		return true;
	}
	issues.push(issue({
		rowIndex: row.rowIndex,
		column,
		messageKey: 'import.staff.validation.required',
	}));
	return false;
}

export function validateStaffImportRows(
	rows: readonly StaffImportRow[],
	context: StaffImportValidationContext = {},
): StaffImportValidationResult {
	const errors: StaffImportValidationIssue[] = [];
	const warnings: StaffImportValidationIssue[] = [];
	const validRows: ValidatedStaffImportRow[] = [];
	const codesInFile = new Map<string, number>();
	const emailsInFile = new Map<string, number>();

	for (const row of rows) {
		const rowIssues: StaffImportValidationIssue[] = [];

		const hasCode = validateRequiredField(row, 'code', row.code, rowIssues);
		const hasPrenom = validateRequiredField(row, 'prenom', row.prenom, rowIssues);
		const hasNom = validateRequiredField(row, 'nom', row.nom, rowIssues);
		const hasRole = validateRequiredField(row, 'role', row.role, rowIssues);

		if (hasCode) {
			const normalizedCode = normalizeImportCode(row.code);
			const previousRow = codesInFile.get(normalizedCode);
			if (previousRow != null) {
				rowIssues.push(issue({
					rowIndex: row.rowIndex,
					column: 'code',
					value: row.code,
					messageKey: 'import.staff.validation.duplicateCodeInFile',
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
					messageKey: 'import.staff.validation.duplicateCodeExisting',
				}));
			}
		}

		if (hasRole && !isKnownStaffImportRole(row.role)) {
			rowIssues.push(issue({
				rowIndex: row.rowIndex,
				column: 'role',
				value: row.role,
				messageKey: 'import.staff.validation.unknownRole',
				severity: 'warning',
				suggestions: staffRoleSuggestions(row.role),
			}));
		}

		if (row.email?.trim()) {
			if (!EMAIL_PATTERN.test(row.email.trim())) {
				rowIssues.push(issue({
					rowIndex: row.rowIndex,
					column: 'email',
					value: row.email,
					messageKey: 'import.staff.validation.invalidEmail',
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
						messageKey: 'import.staff.validation.duplicateEmailInFile',
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

		if (blockingIssues.length === 0 && hasCode && hasPrenom && hasNom && hasRole) {
			validRows.push({ ...row });
		}
	}

	return { validRows, errors, warnings };
}

export function canImportValidatedStaff(result: StaffImportValidationResult | null): boolean {
	return canImportValidatedRows(result);
}
