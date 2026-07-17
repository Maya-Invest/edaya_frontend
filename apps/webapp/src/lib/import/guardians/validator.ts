import type {
	GuardianImportColumnKey,
	GuardianImportRow,
	GuardianImportValidationContext,
	GuardianImportValidationIssue,
	GuardianImportValidationResult,
	ValidatedGuardianImportRow,
} from './types';
import { canImportValidatedRows } from '$lib/import/shared/can-import-validated-rows';
import { normalizeStudentMatricule } from '$lib/import/shared/normalize-student-matricule';

function normalizeLookupValue(value: string): string {
	return value.trim().toLowerCase();
}

function issue(
	input: Omit<GuardianImportValidationIssue, 'severity'> & { severity?: GuardianImportValidationIssue['severity'] },
): GuardianImportValidationIssue {
	return {
		...input,
		severity: input.severity ?? 'error',
	};
}

function validateRequiredField(
	row: GuardianImportRow,
	column: GuardianImportColumnKey,
	value: string,
	issues: GuardianImportValidationIssue[],
): boolean {
	if (value.trim().length > 0) {
		return true;
	}
	issues.push(issue({
		rowIndex: row.rowIndex,
		column,
		messageKey: 'import.guardians.validation.required',
	}));
	return false;
}

function matriculeSuggestions(
	context: GuardianImportValidationContext,
	query: string,
): string[] {
	const normalizedQuery = normalizeLookupValue(query);
	const suggestions = [...context.studentMatricules.values()]
		.map(entry => entry.matricule)
		.filter((matricule) => {
			const normalized = normalizeLookupValue(matricule);
			return normalized.includes(normalizedQuery) || normalizedQuery.includes(normalized);
		})
		.slice(0, 5);

	if (suggestions.length > 0) {
		return suggestions;
	}

	return [...context.studentMatricules.values()]
		.map(entry => entry.matricule)
		.slice(0, 5);
}

export function validateGuardianImportRows(
	rows: readonly GuardianImportRow[],
	context: GuardianImportValidationContext,
): GuardianImportValidationResult {
	const errors: GuardianImportValidationIssue[] = [];
	const warnings: GuardianImportValidationIssue[] = [];
	const validRows: ValidatedGuardianImportRow[] = [];
	const linksInFile = new Map<string, number>();

	for (const row of rows) {
		const rowIssues: GuardianImportValidationIssue[] = [];

		const hasPrenom = validateRequiredField(row, 'prenom', row.prenom, rowIssues);
		const hasNom = validateRequiredField(row, 'nom', row.nom, rowIssues);
		const hasMatricule = validateRequiredField(row, 'eleve_matricule', row.eleve_matricule, rowIssues);

		let studentId: string | undefined;
		if (hasMatricule) {
			const normalizedMatricule = normalizeStudentMatricule(row.eleve_matricule);
			const match = context.studentMatricules.get(normalizedMatricule);
			if (match) {
				studentId = match.studentId;
			}
			else {
				rowIssues.push(issue({
					rowIndex: row.rowIndex,
					column: 'eleve_matricule',
					value: row.eleve_matricule,
					messageKey: 'import.guardians.validation.studentNotFound',
					suggestions: matriculeSuggestions(context, row.eleve_matricule),
				}));
			}
		}

		if (hasPrenom && hasNom && studentId) {
			const duplicateKey = [
				studentId,
				normalizeLookupValue(row.prenom),
				normalizeLookupValue(row.nom),
			].join('::');
			const previousRow = linksInFile.get(duplicateKey);
			if (previousRow != null) {
				rowIssues.push(issue({
					rowIndex: row.rowIndex,
					column: 'eleve_matricule',
					value: row.eleve_matricule,
					messageKey: 'import.guardians.validation.duplicateInFile',
					messageParams: { row: previousRow },
				}));
			}
			else {
				linksInFile.set(duplicateKey, row.rowIndex);
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

		if (blockingIssues.length === 0 && studentId && hasPrenom && hasNom) {
			validRows.push({
				...row,
				studentId,
			});
		}
	}

	return { validRows, errors, warnings };
}

export function canImportValidatedGuardians(result: GuardianImportValidationResult | null): boolean {
	return canImportValidatedRows(result);
}
