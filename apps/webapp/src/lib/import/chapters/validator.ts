import type {

	ChapterImportColumnKey,

	ChapterImportRow,

	ChapterImportValidationContext,

	ChapterImportValidationIssue,

	ChapterImportValidationResult,

	ValidatedChapterImportRow,

} from './types';

import { parseChapterSequenceOrder } from './parse-sequence-order';

import { resolveChapterImportTargets } from './resolve-chapter-targets';

import { canImportValidatedRows } from '$lib/import/shared/can-import-validated-rows';



function normalizeLookupValue(value: string): string {

	return value.trim().toLowerCase();

}



function issue(

	input: Omit<ChapterImportValidationIssue, 'severity'> & { severity?: ChapterImportValidationIssue['severity'] },

): ChapterImportValidationIssue {

	return {

		...input,

		severity: input.severity ?? 'error',

	};

}



function validateRequiredField(

	row: ChapterImportRow,

	column: ChapterImportColumnKey,

	value: string,

	issues: ChapterImportValidationIssue[],

): boolean {

	if (value.trim().length > 0) {

		return true;

	}

	issues.push(issue({

		rowIndex: row.rowIndex,

		column,

		messageKey: 'import.chapters.validation.required',

	}));

	return false;

}



export function validateChapterImportRows(

	rows: readonly ChapterImportRow[],

	context: ChapterImportValidationContext,

): ChapterImportValidationResult {

	const errors: ChapterImportValidationIssue[] = [];

	const warnings: ChapterImportValidationIssue[] = [];

	const validRows: ValidatedChapterImportRow[] = [];

	const chaptersInFile = new Map<string, number>();



	for (const row of rows) {

		const rowIssues: ChapterImportValidationIssue[] = [];



		const hasNiveau = validateRequiredField(row, 'niveau', row.niveau, rowIssues);

		const hasMatiere = validateRequiredField(row, 'matiere', row.matiere, rowIssues);

		const hasTitre = validateRequiredField(row, 'titre', row.titre, rowIssues);



		let sequenceOrder = 1;

		if (row.ordre?.trim()) {

			const parsed = parseChapterSequenceOrder(row.ordre);

			if (parsed == null) {

				rowIssues.push(issue({

					rowIndex: row.rowIndex,

					column: 'ordre',

					value: row.ordre,

					messageKey: 'import.chapters.validation.invalidOrder',

				}));

			}

			else {

				sequenceOrder = parsed;

			}

		}



		let targets = [] as ValidatedChapterImportRow['targets'];

		if (hasNiveau && hasMatiere) {

			const resolution = resolveChapterImportTargets(row.niveau, row.matiere, context);

			if (resolution.targets.length > 0) {

				targets = resolution.targets;

			}

			else if (resolution.levelSuggestions?.length) {

				rowIssues.push(issue({

					rowIndex: row.rowIndex,

					column: 'niveau',

					value: row.niveau,

					messageKey: 'import.chapters.validation.levelNotFound',

					suggestions: resolution.levelSuggestions,

				}));

			}

			else {

				rowIssues.push(issue({

					rowIndex: row.rowIndex,

					column: 'matiere',

					value: row.matiere,

					messageKey: 'import.chapters.validation.subjectNotFound',

					suggestions: resolution.suggestions,

				}));

			}

		}



		if (hasTitre && targets.length > 0) {

			for (const target of targets) {

				const duplicateKey = `${target.classSubjectId}::${normalizeLookupValue(row.titre)}`;

				const previousRow = chaptersInFile.get(duplicateKey);

				if (previousRow != null) {

					rowIssues.push(issue({

						rowIndex: row.rowIndex,

						column: 'titre',

						value: row.titre,

						messageKey: 'import.chapters.validation.duplicateInFile',

						messageParams: { row: previousRow },

					}));

					break;

				}

			}



			if (!rowIssues.some(entry => entry.messageKey === 'import.chapters.validation.duplicateInFile')) {

				for (const target of targets) {

					chaptersInFile.set(

						`${target.classSubjectId}::${normalizeLookupValue(row.titre)}`,

						row.rowIndex,

					);

				}

			}

		}



		if (targets.length > 1) {

			warnings.push(issue({

				rowIndex: row.rowIndex,

				column: 'matiere',

				value: row.matiere,

				messageKey: 'import.chapters.validation.multipleClasses',

				messageParams: { n: targets.length },

				severity: 'warning',

			}));

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



		if (blockingIssues.length === 0 && hasNiveau && hasMatiere && hasTitre && targets.length > 0) {

			validRows.push({

				...row,

				sequenceOrder,

				targets,

			});

		}

	}



	return { validRows, errors, warnings };

}



export function canImportValidatedChapters(result: ChapterImportValidationResult | null): boolean {

	return canImportValidatedRows(result);

}



export function countChapterImportOperations(rows: readonly ValidatedChapterImportRow[]): number {

	return rows.reduce((total, row) => total + row.targets.length, 0);

}

