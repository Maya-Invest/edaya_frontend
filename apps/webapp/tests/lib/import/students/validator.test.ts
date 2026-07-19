import { describe, expect, it } from 'bun:test';
import type { StudentImportRow } from '$lib/import/students/types';
import {
	canImportValidatedStudents,
	isValidStudentImportBirthDate,
	validateStudentImportRows,
} from '$lib/import/students/validator';

const CLASSES = [
	{ id: 'class-6a', name: '6ème A' },
	{ id: 'class-6b', name: '6ème B' },
] as const;

function row(overrides: Partial<StudentImportRow> & Pick<StudentImportRow, 'rowIndex'>): StudentImportRow {
	return {
		prenom: 'Jean',
		nom: 'Dupont',
		matricule: 'MAT-2024-001',
		classe: '6ème A',
		...overrides,
	};
}

describe('student import validator', () => {
	it('accepts valid rows and resolves class ids', () => {
		const result = validateStudentImportRows(
			[
				row({ rowIndex: 2 }),
				row({ rowIndex: 3, prenom: 'Marie', nom: 'Kouassi', matricule: 'MAT-2024-002' }),
			],
			{ classes: CLASSES },
		);

		expect(result.errors).toEqual([]);
		expect(result.validRows).toHaveLength(2);
		expect(result.validRows[0]?.classGroupId).toBe('class-6a');
	});

	it('flags missing required fields', () => {
		const result = validateStudentImportRows(
			[row({ rowIndex: 2, prenom: '' })],
			{ classes: CLASSES },
		);

		expect(result.validRows).toEqual([]);
		expect(result.errors[0]?.column).toBe('prenom');
		expect(result.errors[0]?.messageKey).toBe('import.students.validation.required');
	});

	it('flags invalid birth dates', () => {
		const result = validateStudentImportRows(
			[row({ rowIndex: 2, date_naissance: '32-13-2020' })],
			{ classes: CLASSES },
		);

		expect(result.validRows).toEqual([]);
		expect(result.errors[0]?.column).toBe('date_naissance');
		expect(result.errors[0]?.messageKey).toBe('import.students.validation.invalidDate');
	});

	it('flags unknown classes with suggestions', () => {
		const result = validateStudentImportRows(
			[row({ rowIndex: 2, classe: '6ème Z' })],
			{ classes: CLASSES },
		);

		expect(result.validRows).toEqual([]);
		expect(result.errors[0]?.column).toBe('classe');
		expect(result.errors[0]?.messageKey).toBe('import.students.validation.classNotFound');
		expect(result.errors[0]?.suggestions).toContain('6ème A');
	});

	it('flags duplicate matricules within the file', () => {
		const result = validateStudentImportRows(
			[
				row({ rowIndex: 2, matricule: 'MAT-001' }),
				row({ rowIndex: 3, prenom: 'Marie', matricule: 'MAT-001' }),
			],
			{ classes: CLASSES },
		);

		expect(result.validRows).toHaveLength(1);
		expect(result.errors[0]?.messageKey).toBe('import.students.validation.duplicateMatriculeInFile');
	});

	it('flags matricules that already exist in the school', () => {
		const result = validateStudentImportRows(
			[row({ rowIndex: 2, matricule: 'MAT-EXISTING' })],
			{ classes: CLASSES, existingMatricules: new Set(['mat-existing']) },
		);

		expect(result.validRows).toEqual([]);
		expect(result.errors[0]?.messageKey).toBe('import.students.validation.duplicateMatriculeExisting');
	});

	it('validates iso dates', () => {
		expect(isValidStudentImportBirthDate('2012-03-15')).toBe(true);
		expect(isValidStudentImportBirthDate('2012-03-32')).toBe(false);
	});

	it('enables import when there are valid rows, even with blocking errors on other rows', () => {
		const allValid = validateStudentImportRows([row({ rowIndex: 2 })], { classes: CLASSES });
		const partial = validateStudentImportRows(
			[
				row({ rowIndex: 2 }),
				row({ rowIndex: 3, nom: '' }),
			],
			{ classes: CLASSES },
		);
		const noneValid = validateStudentImportRows([row({ rowIndex: 2, nom: '' })], { classes: CLASSES });

		expect(canImportValidatedStudents(allValid)).toBe(true);
		expect(canImportValidatedStudents(partial)).toBe(true);
		expect(partial.errors.length).toBeGreaterThan(0);
		expect(canImportValidatedStudents(noneValid)).toBe(false);
	});
});
