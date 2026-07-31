import { describe, expect, it } from 'bun:test';
import type { ClassImportRow } from '$lib/import/classes/types';
import {
	canImportValidatedClasses,
	parseClassImportCapacity,
	validateClassImportRows,
} from '$lib/import/classes/validator';

const GRADE_LEVELS = [
	{ id: 'gl-6', name: '6ème' },
	{ id: 'gl-5', name: '5ème' },
] as const;

const EXISTING_CLASSES = [
	{ id: '6a', name: '6ème A', gradeLevelId: 'gl-6' },
] as const;

function row(overrides: Partial<ClassImportRow> & Pick<ClassImportRow, 'rowIndex'>): ClassImportRow {
	return {
		nom: '6ème B',
		niveau: '6ème',
		...overrides,
	};
}

describe('class import validator', () => {
	it('accepts valid rows and resolves grade level ids', () => {
		const result = validateClassImportRows(
			[row({ rowIndex: 2 }), row({ rowIndex: 3, nom: '6ème C' })],
			{ gradeLevels: GRADE_LEVELS, existingClasses: EXISTING_CLASSES },
		);

		expect(result.errors).toEqual([]);
		expect(result.validRows).toHaveLength(2);
		expect(result.validRows[0]?.gradeLevelId).toBe('gl-6');
	});

	it('resolves niveau aliases (6eme) against wizard and legacy grade level names', () => {
		const legacyLevels = [
			{ id: 'gl-6', name: 'Sixième' },
			{ id: 'gl-5', name: 'Cinquième' },
		] as const;

		const fromLegacy = validateClassImportRows(
			[row({ rowIndex: 2, niveau: '6eme', nom: '6eme B' })],
			{ gradeLevels: legacyLevels, existingClasses: [] },
		);
		expect(fromLegacy.errors).toEqual([]);
		expect(fromLegacy.validRows[0]?.gradeLevelId).toBe('gl-6');

		const fromWizard = validateClassImportRows(
			[row({ rowIndex: 2, niveau: '6eme', nom: '6eme B' })],
			{ gradeLevels: GRADE_LEVELS, existingClasses: EXISTING_CLASSES },
		);
		expect(fromWizard.errors).toEqual([]);
		expect(fromWizard.validRows[0]?.gradeLevelId).toBe('gl-6');
	});

	it('flags missing required fields', () => {
		const result = validateClassImportRows(
			[row({ rowIndex: 2, nom: '' })],
			{ gradeLevels: GRADE_LEVELS, existingClasses: EXISTING_CLASSES },
		);

		expect(result.validRows).toEqual([]);
		expect(result.errors[0]?.column).toBe('nom');
		expect(result.errors[0]?.messageKey).toBe('import.classes.validation.required');
	});

	it('flags unknown grade levels with suggestions', () => {
		const result = validateClassImportRows(
			[row({ rowIndex: 2, niveau: '4ème' })],
			{ gradeLevels: GRADE_LEVELS, existingClasses: EXISTING_CLASSES },
		);

		expect(result.validRows).toEqual([]);
		expect(result.errors[0]?.column).toBe('niveau');
		expect(result.errors[0]?.messageKey).toBe('import.classes.validation.levelNotFound');
		expect(result.errors[0]?.suggestions).toContain('6ème');
	});

	it('flags invalid capacities', () => {
		const result = validateClassImportRows(
			[row({ rowIndex: 2, capacite: 'abc' })],
			{ gradeLevels: GRADE_LEVELS, existingClasses: EXISTING_CLASSES },
		);

		expect(result.validRows).toEqual([]);
		expect(result.errors[0]?.column).toBe('capacite');
		expect(result.errors[0]?.messageKey).toBe('import.classes.validation.invalidCapacity');
	});

	it('flags duplicate class names within the file', () => {
		const result = validateClassImportRows(
			[
				row({ rowIndex: 2, nom: '6ème D' }),
				row({ rowIndex: 3, nom: '6ème D' }),
			],
			{ gradeLevels: GRADE_LEVELS, existingClasses: EXISTING_CLASSES },
		);

		expect(result.validRows).toHaveLength(1);
		expect(result.errors[0]?.messageKey).toBe('import.classes.validation.duplicateInFile');
	});

	it('flags class names that already exist for the same level', () => {
		const result = validateClassImportRows(
			[row({ rowIndex: 2, nom: '6ème A' })],
			{ gradeLevels: GRADE_LEVELS, existingClasses: EXISTING_CLASSES },
		);

		expect(result.validRows).toEqual([]);
		expect(result.errors[0]?.messageKey).toBe('import.classes.validation.duplicateExisting');
	});

	it('parses positive integer capacities', () => {
		expect(parseClassImportCapacity('35')).toBe(35);
		expect(parseClassImportCapacity('0')).toBeNull();
		expect(parseClassImportCapacity('abc')).toBeNull();
	});

	it('enables import when there are valid rows, even with blocking errors on other rows', () => {
		const allValid = validateClassImportRows([row({ rowIndex: 2 })], {
			gradeLevels: GRADE_LEVELS,
			existingClasses: EXISTING_CLASSES,
		});
		const partial = validateClassImportRows(
			[
				row({ rowIndex: 2, nom: '6ème C' }),
				row({ rowIndex: 3, nom: '6ème A' }),
			],
			{ gradeLevels: GRADE_LEVELS, existingClasses: EXISTING_CLASSES },
		);
		const noneValid = validateClassImportRows([row({ rowIndex: 2, nom: '' })], {
			gradeLevels: GRADE_LEVELS,
			existingClasses: EXISTING_CLASSES,
		});

		expect(canImportValidatedClasses(allValid)).toBe(true);
		expect(canImportValidatedClasses(partial)).toBe(true);
		expect(partial.errors.length).toBeGreaterThan(0);
		expect(canImportValidatedClasses(noneValid)).toBe(false);
	});
});
