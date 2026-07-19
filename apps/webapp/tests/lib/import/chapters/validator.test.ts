import { describe, expect, it } from 'bun:test';
import type { ChapterImportRow } from '$lib/import/chapters/types';
import {
	canImportValidatedChapters,
	countChapterImportOperations,
	validateChapterImportRows,
} from '$lib/import/chapters/validator';

function row(overrides: Partial<ChapterImportRow> & Pick<ChapterImportRow, 'rowIndex'>): ChapterImportRow {
	return {
		niveau: '6ème',
		matiere: 'Mathématiques',
		titre: 'Les fractions',
		...overrides,
	};
}

const CONTEXT = {
	classSubjects: [
		{
			classSubjectId: 'cs-6a-math',
			subjectId: 'subj-math-6a',
			classGroupId: 'class-6a',
			gradeLevelId: 'gl-6',
			subjectName: 'Mathématiques',
			className: '6ème A',
			gradeLevelName: '6ème',
		},
		{
			classSubjectId: 'cs-6b-math',
			subjectId: 'subj-math-6b',
			classGroupId: 'class-6b',
			gradeLevelId: 'gl-6',
			subjectName: 'Mathématiques',
			className: '6ème B',
			gradeLevelName: '6ème',
		},
	],
};

describe('chapter import validator', () => {
	it('accepts valid rows and resolves all matching class subjects', () => {
		const result = validateChapterImportRows([
			row({ rowIndex: 2, ordre: '3' }),
		], CONTEXT);

		expect(result.errors).toEqual([]);
		expect(result.validRows[0]?.sequenceOrder).toBe(3);
		expect(result.validRows[0]?.targets).toHaveLength(2);
		expect(countChapterImportOperations(result.validRows)).toBe(2);
		expect(canImportValidatedChapters(result)).toBe(true);
	});

	it('flags missing required fields', () => {
		const result = validateChapterImportRows([
			row({ rowIndex: 2, titre: '' }),
		], CONTEXT);

		expect(result.validRows).toHaveLength(0);
		expect(result.errors[0]?.messageKey).toBe('import.chapters.validation.required');
	});

	it('flags unknown subjects with suggestions', () => {
		const result = validateChapterImportRows([
			row({ rowIndex: 2, matiere: 'Latin' }),
		], CONTEXT);

		expect(result.validRows).toHaveLength(0);
		expect(result.errors[0]?.messageKey).toBe('import.chapters.validation.subjectNotFound');
		expect(result.errors[0]?.suggestions).toContain('Mathématiques');
	});

	it('flags invalid order values', () => {
		const result = validateChapterImportRows([
			row({ rowIndex: 2, ordre: 'abc' }),
		], CONTEXT);

		expect(result.validRows).toHaveLength(0);
		expect(result.errors[0]?.messageKey).toBe('import.chapters.validation.invalidOrder');
	});

	it('flags duplicate chapters for the same class subject in the file', () => {
		const result = validateChapterImportRows([
			row({ rowIndex: 2 }),
			row({ rowIndex: 3 }),
		], CONTEXT);

		expect(result.errors[0]?.messageKey).toBe('import.chapters.validation.duplicateInFile');
		expect(result.validRows).toHaveLength(1);
	});
});
