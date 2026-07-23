import { describe, expect, it } from 'bun:test';
import type { GuardianImportRow } from '$lib/import/guardians/types';
import {
	canImportValidatedGuardians,
	validateGuardianImportRows,
} from '$lib/import/guardians/validator';
import { normalizeImportCode } from '$lib/import/shared/normalize-import-code';

const STUDENT_MATRICULES = new Map([
	['mat-2024-001', { studentId: 'stu-1', matricule: 'MAT-2024-001' }],
	['mat-2024-002', { studentId: 'stu-2', matricule: 'MAT-2024-002' }],
]);

const VALIDATION_CONTEXT = {
	studentMatricules: STUDENT_MATRICULES,
	multiValueSeparator: ';' as const,
};

function row(overrides: Partial<GuardianImportRow> & Pick<GuardianImportRow, 'rowIndex'>): GuardianImportRow {
	return {
		code: 'TUT-001',
		prenom: 'Aminata',
		nom: 'Koné',
		eleve_matricule: 'MAT-2024-001',
		...overrides,
	};
}

describe('guardian import validator', () => {
	it('accepts valid rows and resolves student ids', () => {
		const result = validateGuardianImportRows(
			[
				row({ rowIndex: 2 }),
				row({ rowIndex: 3, code: 'TUT-002', prenom: 'Moussa', nom: 'Traoré', eleve_matricule: 'MAT-2024-002' }),
			],
			VALIDATION_CONTEXT,
		);

		expect(result.errors).toEqual([]);
		expect(result.validRows).toHaveLength(2);
		expect(result.validRows[0]?.studentIds).toEqual(['stu-1']);
	});

	it('flags unknown student matricules with suggestions', () => {
		const result = validateGuardianImportRows(
			[row({ rowIndex: 2, eleve_matricule: 'MAT-999' })],
			VALIDATION_CONTEXT,
		);

		expect(result.validRows).toEqual([]);
		expect(result.errors[0]?.messageKey).toBe('import.guardians.validation.studentNotFound');
		expect(result.errors[0]?.suggestions).toContain('MAT-2024-001');
	});

	it('flags duplicate guardian links within the file', () => {
		const result = validateGuardianImportRows(
			[
				row({ rowIndex: 2, code: 'TUT-001' }),
				row({ rowIndex: 3, code: 'TUT-002' }),
			],
			VALIDATION_CONTEXT,
		);

		expect(result.validRows).toHaveLength(1);
		expect(result.errors[0]?.messageKey).toBe('import.guardians.validation.duplicateInFile');
	});

	it('rejects duplicate code in file', () => {
		const result = validateGuardianImportRows(
			[
				row({ rowIndex: 2, code: 'TUT-001', eleve_matricule: 'MAT-2024-001' }),
				row({
					rowIndex: 3,
					code: 'tut-001',
					prenom: 'Moussa',
					nom: 'Traoré',
					eleve_matricule: 'MAT-2024-002',
				}),
			],
			VALIDATION_CONTEXT,
		);

		expect(result.validRows).toHaveLength(1);
		expect(result.errors[0]?.messageKey).toBe('import.guardians.validation.duplicateCodeInFile');
	});

	it('rejects duplicate code vs existingCodes', () => {
		const result = validateGuardianImportRows(
			[row({ rowIndex: 2, code: 'TUT-010' })],
			{
				...VALIDATION_CONTEXT,
				existingCodes: new Set([normalizeImportCode('TUT-010')]),
			},
		);

		expect(result.validRows).toHaveLength(0);
		expect(result.errors[0]?.messageKey).toBe('import.guardians.validation.duplicateCodeExisting');
	});

	it('enables import when there are valid rows, even with blocking errors on other rows', () => {
		const partial = validateGuardianImportRows(
			[row({ rowIndex: 2 }), row({ rowIndex: 3, code: 'TUT-003', prenom: '' })],
			VALIDATION_CONTEXT,
		);

		expect(canImportValidatedGuardians(partial)).toBe(true);
		expect(partial.errors.length).toBeGreaterThan(0);
	});

	it('splits multiple matricules with ampersand when configured', () => {
		const result = validateGuardianImportRows(
			[row({ rowIndex: 2, eleve_matricule: 'MAT-2024-001&MAT-2024-002' })],
			{ ...VALIDATION_CONTEXT, multiValueSeparator: '&' },
		);

		expect(result.errors).toEqual([]);
		expect(result.validRows[0]?.studentIds).toEqual(['stu-1', 'stu-2']);
	});
});
