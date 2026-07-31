import { describe, expect, it } from 'bun:test';

import type { SubjectImportRow } from '$lib/import/subjects/types';
import { subjectImportDuplicateKey } from '$lib/import/shared/subject-import-duplicate-key';
import {
	canImportValidatedSubjects,
	validateSubjectImportRows,
} from '$lib/import/subjects/validator';



function row(overrides: Partial<SubjectImportRow> & Pick<SubjectImportRow, 'rowIndex'>): SubjectImportRow {

	return {

		nom: 'Mathématiques',

		niveau: '6ème',

		...overrides,

	};

}



const GRADE_LEVELS = [{ id: 'gl-6', name: '6ème' }];



const CLASS_GROUPS = [

	{ id: 'class-6a', gradeLevelId: 'gl-6' },

	{ id: 'class-6b', gradeLevelId: 'gl-6' },

];



describe('subject import validator', () => {

	it('accepts valid rows and resolves grade level ids', () => {

		const result = validateSubjectImportRows([

			row({ rowIndex: 2, coefficient: '3' }),

		], { gradeLevels: GRADE_LEVELS, classGroups: CLASS_GROUPS });



		expect(result.errors).toEqual([]);

		expect(result.validRows[0]?.gradeLevelId).toBe('gl-6');

		expect(result.validRows[0]?.classGroupIds).toEqual(['class-6a', 'class-6b']);

		expect(result.validRows[0]?.coefficientValue).toBe(3);

		expect(canImportValidatedSubjects(result)).toBe(true);

	});



	it('flags missing required fields', () => {

		const result = validateSubjectImportRows([

			row({ rowIndex: 2, nom: '' }),

		], { gradeLevels: GRADE_LEVELS, classGroups: CLASS_GROUPS });



		expect(result.validRows).toHaveLength(0);

		expect(result.errors[0]?.messageKey).toBe('import.subjects.validation.required');

	});



	it('flags unknown grade levels with suggestions', () => {

		const result = validateSubjectImportRows([

			row({ rowIndex: 2, niveau: '7ème' }),

		], { gradeLevels: GRADE_LEVELS, classGroups: CLASS_GROUPS });



		expect(result.validRows).toHaveLength(0);

		expect(result.errors[0]?.messageKey).toBe('import.subjects.validation.levelNotFound');

		expect(result.errors[0]?.suggestions).toContain('6ème');

	});



	it('flags invalid coefficients', () => {

		const result = validateSubjectImportRows([

			row({ rowIndex: 2, coefficient: 'abc' }),

		], { gradeLevels: GRADE_LEVELS, classGroups: CLASS_GROUPS });



		expect(result.validRows).toHaveLength(0);

		expect(result.errors[0]?.messageKey).toBe('import.subjects.validation.invalidCoefficient');

	});



	it('flags duplicate subjects for the same level in the file', () => {

		const result = validateSubjectImportRows([

			row({ rowIndex: 2 }),

			row({ rowIndex: 3 }),

		], { gradeLevels: GRADE_LEVELS, classGroups: CLASS_GROUPS });



		expect(result.errors[0]?.messageKey).toBe('import.subjects.validation.duplicateInFile');

		expect(result.validRows).toHaveLength(1);

	});

	it('flags subjects that already exist for the grade level', () => {
		const existing = new Set([subjectImportDuplicateKey('gl-6', 'Mathématiques')]);
		const result = validateSubjectImportRows([
			row({ rowIndex: 2 }),
		], {
			gradeLevels: GRADE_LEVELS,
			classGroups: CLASS_GROUPS,
			existingSubjectKeys: existing,
		});

		expect(result.validRows).toHaveLength(0);
		expect(result.errors[0]?.messageKey).toBe('import.subjects.validation.duplicateExisting');
	});

});

