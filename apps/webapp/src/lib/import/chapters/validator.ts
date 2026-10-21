import type {
	ChapterImportColumnKey,
	ChapterImportRow,
	ChapterImportValidationContext,
	ChapterImportValidationIssue,
	ChapterImportValidationResult,
	ValidatedChapterImportRow,
} from './types';
import { canImportValidatedRows } from '$lib/import/shared/can-import-validated-rows';
import { parseChapterSequenceOrder } from './parse-sequence-order';
import { resolveChapterImportTarget } from './resolve-chapter-targets';
import { chapterImportDuplicateKey } from './types';

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

		let target: ValidatedChapterImportRow['target'] | undefined;

		if (hasNiveau && hasMatiere) {
			const resolution = resolveChapterImportTarget(row.niveau, row.matiere, context, row.subjectId);

			if (resolution.target) {
				target = resolution.target;
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
					messageKey: resolution.ambiguous ? 'import.chapters.validation.ambiguousSubject' : 'import.chapters.validation.subjectNotFound',
					suggestions: resolution.suggestions,
				}));
			}
		}

		if (hasTitre && target) {
			const duplicateKey = chapterImportDuplicateKey(target.subjectId, row.titre);
			const previousRow = chaptersInFile.get(duplicateKey);
			if (previousRow != null) {
				rowIssues.push(issue({
					rowIndex: row.rowIndex,
					column: 'titre',
					value: row.titre,
					messageKey: 'import.chapters.validation.duplicateInFile',
					messageParams: { row: previousRow },
				}));
			}
			else {
				chaptersInFile.set(duplicateKey, row.rowIndex);
			}

			if (context.existingChapterKeys?.has(duplicateKey)) {
				rowIssues.push(issue({
					rowIndex: row.rowIndex,
					column: 'titre',
					value: row.titre,
					messageKey: 'import.chapters.validation.duplicateExisting',
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

		if (blockingIssues.length === 0 && hasNiveau && hasMatiere && hasTitre && target) {
			validRows.push({
				...row,
				sequenceOrder,
				target,
			});
		}
	}

	return { validRows, errors, warnings };
}

export function canImportValidatedChapters(result: ChapterImportValidationResult | null): boolean {
	return canImportValidatedRows(result);
}

export function countChapterImportOperations(rows: readonly ValidatedChapterImportRow[]): number {
	return rows.length;
}
