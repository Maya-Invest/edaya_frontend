import type {

	SubjectImportColumnKey,

	SubjectImportRow,

	SubjectImportValidationContext,

	SubjectImportValidationIssue,

	SubjectImportValidationResult,

	ValidatedSubjectImportRow,

} from './types';

import { canImportValidatedRows } from '$lib/import/shared/can-import-validated-rows';

import {

	buildImportGradeLevelLookup,

	resolveImportGradeLevel,

} from '$lib/import/shared/resolve-import-grade-level';

import { subjectImportDuplicateKey } from '$lib/import/shared/subject-import-duplicate-key';

import { parseSubjectCoefficient } from './parse-coefficient';

function issue(

	input: Omit<SubjectImportValidationIssue, 'severity'> & { severity?: SubjectImportValidationIssue['severity'] },

): SubjectImportValidationIssue {
	return {

		...input,

		severity: input.severity ?? 'error',

	};
}

function validateRequiredField(

	row: SubjectImportRow,

	column: SubjectImportColumnKey,

	value: string,

	issues: SubjectImportValidationIssue[],

): boolean {
	if (value.trim().length > 0) {
		return true;
	}

	issues.push(issue({

		rowIndex: row.rowIndex,

		column,

		messageKey: 'import.subjects.validation.required',

	}));

	return false;
}

export function validateSubjectImportRows(

	rows: readonly SubjectImportRow[],

	context: SubjectImportValidationContext,

): SubjectImportValidationResult {
	const errors: SubjectImportValidationIssue[] = [];

	const warnings: SubjectImportValidationIssue[] = [];

	const validRows: ValidatedSubjectImportRow[] = [];

	const subjectsInFile = new Map<string, number>();

	const gradeLevelLookup = buildImportGradeLevelLookup(context.gradeLevels);

	for (const row of rows) {
		const rowIssues: SubjectImportValidationIssue[] = [];

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

					messageKey: 'import.subjects.validation.levelNotFound',

					suggestions: resolution.suggestions,

				}));
			}
		}

		const classGroupIds = gradeLevelId

			? context.classGroups.filter(entry => entry.gradeLevelId === gradeLevelId).map(entry => entry.id)

			: [];

		if (gradeLevelId && classGroupIds.length === 0) {
			rowIssues.push(issue({

				rowIndex: row.rowIndex,

				column: 'niveau',

				value: row.niveau,

				messageKey: 'import.subjects.validation.noClassesForLevel',

			}));
		}

		let coefficientValue: number | undefined;

		if (row.coefficient?.trim()) {
			const parsed = parseSubjectCoefficient(row.coefficient);

			if (parsed == null) {
				rowIssues.push(issue({

					rowIndex: row.rowIndex,

					column: 'coefficient',

					value: row.coefficient,

					messageKey: 'import.subjects.validation.invalidCoefficient',

				}));
			}

			else {
				coefficientValue = parsed;
			}
		}

		if (hasNom && gradeLevelId) {
			const duplicateKey = subjectImportDuplicateKey(gradeLevelId, row.nom);

			const previousRow = subjectsInFile.get(duplicateKey);

			if (previousRow != null) {
				rowIssues.push(issue({

					rowIndex: row.rowIndex,

					column: 'nom',

					value: row.nom,

					messageKey: 'import.subjects.validation.duplicateInFile',

					messageParams: { row: previousRow },

				}));
			}

			else {
				subjectsInFile.set(duplicateKey, row.rowIndex);
			}

			if (context.existingSubjectKeys?.has(duplicateKey)) {
				rowIssues.push(issue({

					rowIndex: row.rowIndex,

					column: 'nom',

					value: row.nom,

					messageKey: 'import.subjects.validation.duplicateExisting',

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

		if (blockingIssues.length === 0 && hasNom && gradeLevelId && classGroupIds.length > 0) {
			validRows.push({

				...row,

				gradeLevelId,

				classGroupIds,

				...(coefficientValue != null ? { coefficientValue } : {}),

			});
		}
	}

	return { validRows, errors, warnings };
}

export function canImportValidatedSubjects(result: SubjectImportValidationResult | null): boolean {
	return canImportValidatedRows(result);
}
