import type {
	ClassImportColumnKey,
	ClassImportRow,
	ClassImportValidationContext,
	ClassImportValidationIssue,
	ClassImportValidationResult,
	ValidatedClassImportRow,
} from './types';
import { canImportValidatedRows } from '$lib/import/shared/can-import-validated-rows';
import {
	buildImportGradeLevelLookup,
	resolveImportGradeLevel,
} from '$lib/import/shared/resolve-import-grade-level';

function normalizeLookupValue(value: string): string {
	return value.trim().toLowerCase();
}

function issue(
	input: Omit<ClassImportValidationIssue, 'severity'> & { severity?: ClassImportValidationIssue['severity'] },
): ClassImportValidationIssue {
	return {
		...input,
		severity: input.severity ?? 'error',
	};
}

function validateRequiredField(
	row: ClassImportRow,
	column: ClassImportColumnKey,
	value: string,
	issues: ClassImportValidationIssue[],
): boolean {
	if (value.trim().length > 0) {
		return true;
	}
	issues.push(issue({
		rowIndex: row.rowIndex,
		column,
		messageKey: 'import.classes.validation.required',
	}));
	return false;
}

export function parseClassImportCapacity(value: string): number | null | undefined {
	const trimmed = value.trim();
	if (!trimmed) {
		return undefined;
	}
	if (!/^\d+$/.test(trimmed)) {
		return null;
	}
	const parsed = Number.parseInt(trimmed, 10);
	if (!Number.isFinite(parsed) || parsed <= 0) {
		return null;
	}
	return parsed;
}

export function validateClassImportRows(
	rows: readonly ClassImportRow[],
	context: ClassImportValidationContext,
): ClassImportValidationResult {
	const errors: ClassImportValidationIssue[] = [];
	const warnings: ClassImportValidationIssue[] = [];
	const validRows: ValidatedClassImportRow[] = [];
	const gradeLevelLookup = buildImportGradeLevelLookup(context.gradeLevels);
	const namesInFile = new Map<string, number>();

	for (const row of rows) {
		const rowIssues: ClassImportValidationIssue[] = [];

		const hasNom = validateRequiredField(row, 'nom', row.nom, rowIssues);
		const hasNiveau = validateRequiredField(row, 'niveau', row.niveau, rowIssues);

		let gradeLevelId: string | undefined;
		if (hasNiveau) {
			const resolution = resolveImportGradeLevel(row.niveau, gradeLevelLookup, context.gradeLevels);
			if (resolution.gradeLevelId) {
				gradeLevelId = resolution.gradeLevelId;
			}
			else {
				rowIssues.push(issue({
					rowIndex: row.rowIndex,
					column: 'niveau',
					value: row.niveau,
					messageKey: 'import.classes.validation.levelNotFound',
					suggestions: resolution.suggestions,
				}));
			}
		}

		let capacity: number | undefined;
		if (row.capacite?.trim()) {
			const parsedCapacity = parseClassImportCapacity(row.capacite);
			if (parsedCapacity == null) {
				rowIssues.push(issue({
					rowIndex: row.rowIndex,
					column: 'capacite',
					value: row.capacite,
					messageKey: 'import.classes.validation.invalidCapacity',
				}));
			}
			else {
				capacity = parsedCapacity;
			}
		}

		if (hasNom && gradeLevelId) {
			const duplicateKey = `${normalizeLookupValue(row.nom)}::${gradeLevelId}`;
			const previousRow = namesInFile.get(duplicateKey);
			if (previousRow != null) {
				rowIssues.push(issue({
					rowIndex: row.rowIndex,
					column: 'nom',
					value: row.nom,
					messageKey: 'import.classes.validation.duplicateInFile',
					messageParams: { row: previousRow },
				}));
			}
			else {
				namesInFile.set(duplicateKey, row.rowIndex);
			}

			const existingClass = context.existingClasses.find(
				entry => entry.gradeLevelId === gradeLevelId
					&& normalizeLookupValue(entry.name) === normalizeLookupValue(row.nom),
			);
			if (existingClass) {
				rowIssues.push(issue({
					rowIndex: row.rowIndex,
					column: 'nom',
					value: row.nom,
					messageKey: 'import.classes.validation.duplicateExisting',
				}));
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

		if (blockingIssues.length === 0 && gradeLevelId && hasNom) {
			validRows.push({
				...row,
				gradeLevelId,
				...(capacity != null ? { capacity } : {}),
			});
		}
	}

	return { validRows, errors, warnings };
}

export function canImportValidatedClasses(result: ClassImportValidationResult | null): boolean {
	return canImportValidatedRows(result);
}
