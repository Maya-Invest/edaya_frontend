import { describe, expect, it } from 'bun:test';
import type { GuardianImportRow } from '$lib/import/guardians/types';
import {
	canImportValidatedGuardians,
	validateGuardianImportRows,
} from '$lib/import/guardians/validator';

const STUDENT_MATRICULES = new Map([
	['mat-2024-001', { studentId: 'stu-1', matricule: 'MAT-2024-001' }],
	['mat-2024-002', { studentId: 'stu-2', matricule: 'MAT-2024-002' }],
]);

function row(overrides: Partial<GuardianImportRow> & Pick<GuardianImportRow, 'rowIndex'>): GuardianImportRow {
	return {
		prenom: 'Aminata',
		nom: 'Koné',
		eleve_matricule: 'MAT-2024-001',
		...overrides,
	};
}

describe('guardian import validator', () => {
	it('accepts valid rows and resolves student ids', () => {
		const result = validateGuardianImportRows(
			[row({ rowIndex: 2 }), row({ rowIndex: 3, prenom: 'Moussa', nom: 'Traoré', eleve_matricule: 'MAT-2024-002' })],
			{ studentMatricules: STUDENT_MATRICULES },
		);

		expect(result.errors).toEqual([]);
		expect(result.validRows).toHaveLength(2);
		expect(result.validRows[0]?.studentId).toBe('stu-1');
	});

	it('flags unknown student matricules with suggestions', () => {
		const result = validateGuardianImportRows(
			[row({ rowIndex: 2, eleve_matricule: 'MAT-999' })],
			{ studentMatricules: STUDENT_MATRICULES },
		);

		expect(result.validRows).toEqual([]);
		expect(result.errors[0]?.messageKey).toBe('import.guardians.validation.studentNotFound');
		expect(result.errors[0]?.suggestions).toContain('MAT-2024-001');
	});

	it('flags duplicate guardian links within the file', () => {
		const result = validateGuardianImportRows(
			[row({ rowIndex: 2 }), row({ rowIndex: 3 })],
			{ studentMatricules: STUDENT_MATRICULES },
		);

		expect(result.validRows).toHaveLength(1);
		expect(result.errors[0]?.messageKey).toBe('import.guardians.validation.duplicateInFile');
	});

	it('enables import when there are valid rows, even with blocking errors on other rows', () => {
		const partial = validateGuardianImportRows(
			[row({ rowIndex: 2 }), row({ rowIndex: 3, prenom: '' })],
			{ studentMatricules: STUDENT_MATRICULES },
		);

		expect(canImportValidatedGuardians(partial)).toBe(true);
		expect(partial.errors.length).toBeGreaterThan(0);
	});
});
