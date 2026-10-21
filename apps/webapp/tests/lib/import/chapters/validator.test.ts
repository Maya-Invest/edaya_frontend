import type { ChapterImportCatalogTarget, ChapterImportRow } from '$lib/import/chapters/types';
import { chapterImportDuplicateKey } from '$lib/import/chapters/types';
import {
	canImportValidatedChapters,
	countChapterImportOperations,
	validateChapterImportRows,
} from '$lib/import/chapters/validator';
import { describe, expect, it } from 'bun:test';

function row(overrides: Partial<ChapterImportRow> & Pick<ChapterImportRow, 'rowIndex'>): ChapterImportRow {
	return {
		niveau: '6ème',
		matiere: 'Mathématiques',
		titre: 'Les fractions',
		...overrides,
	};
}

const CATALOG_TARGET: ChapterImportCatalogTarget = {
	subjectId: 'subj-math',
	gradeLevelId: 'gl-6',
	gradeLevelName: '6ème',
	subjectName: 'Mathématiques',
	classAssignments: [
		{ classGroupId: 'class-6a', classSubjectId: 'cs-6a-math' },
		{ classGroupId: 'class-6b', classSubjectId: 'cs-6b-math' },
	],
};

const CONTEXT = {
	catalogTargets: [CATALOG_TARGET],
};

describe('chapter import validator', () => {
	it('accepts valid rows and resolves one catalog target per ligne', () => {
		const result = validateChapterImportRows([
			row({ rowIndex: 2, ordre: '3' }),
		], CONTEXT);

		expect(result.errors).toEqual([]);
		expect(result.warnings).toEqual([]);
		expect(result.validRows[0]?.sequenceOrder).toBe(3);
		expect(result.validRows[0]?.target).toEqual(CATALOG_TARGET);
		expect(countChapterImportOperations(result.validRows)).toBe(1);
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

	it('flags duplicate chapters for the same grade-level subject in the file', () => {
		const result = validateChapterImportRows([
			row({ rowIndex: 2 }),
			row({ rowIndex: 3 }),
		], CONTEXT);

		expect(result.errors[0]?.messageKey).toBe('import.chapters.validation.duplicateInFile');
		expect(result.validRows).toHaveLength(1);
	});

	it('flags chapters that already exist via existingChapterKeys', () => {
		const duplicateKey = chapterImportDuplicateKey(
			CATALOG_TARGET.subjectId,
			'Les fractions',
		);
		const result = validateChapterImportRows(
			[row({ rowIndex: 2 })],
			{
				...CONTEXT,
				existingChapterKeys: new Set([duplicateKey]),
			},
		);

		expect(result.validRows).toHaveLength(0);
		expect(result.errors[0]?.messageKey).toBe('import.chapters.validation.duplicateExisting');
	});

	it('accepts chapters before classes exist', () => {
		const result = validateChapterImportRows([
			row({ rowIndex: 2 }),
		], {
			catalogTargets: [{
				...CATALOG_TARGET,
				classAssignments: [],
			}],
		});

		expect(result.validRows).toHaveLength(1);
		expect(result.errors).toEqual([]);
	});
});

it('requires an explicit id for ambiguous names', () => {
	const context = { catalogTargets: [CATALOG_TARGET, { ...CATALOG_TARGET, subjectId: 'other' }] };
	expect(validateChapterImportRows([row({ rowIndex: 2 })], context).errors[0]?.messageKey).toBe('import.chapters.validation.ambiguousSubject');
	expect(validateChapterImportRows([row({ rowIndex: 2, subjectId: 'other' })], context).validRows[0]?.target.subjectId).toBe('other');
});
