import { describe, expect, it } from 'bun:test';
import type { StaffImportRow } from '$lib/import/staff/types';
import {
	canImportValidatedStaff,
	validateStaffImportRows,
} from '$lib/import/staff/validator';

function row(overrides: Partial<StaffImportRow> & Pick<StaffImportRow, 'rowIndex'>): StaffImportRow {
	return {
		prenom: 'Fatou',
		nom: 'Diallo',
		role: 'Secrétaire',
		...overrides,
	};
}

describe('staff import validator', () => {
	it('accepts valid rows with known roles', () => {
		const result = validateStaffImportRows([
			row({ rowIndex: 2 }),
			row({ rowIndex: 3, prenom: 'Kofi', nom: 'Mensah', role: 'Directeur adjoint' }),
		]);

		expect(result.errors).toEqual([]);
		expect(result.validRows).toHaveLength(2);
		expect(canImportValidatedStaff(result)).toBe(true);
	});

	it('flags missing required fields', () => {
		const result = validateStaffImportRows([
			row({ rowIndex: 2, role: '' }),
		]);

		expect(result.validRows).toHaveLength(0);
		expect(result.errors[0]?.messageKey).toBe('import.staff.validation.required');
	});

	it('warns on unknown roles without blocking import', () => {
		const result = validateStaffImportRows([
			row({ rowIndex: 2, role: 'Comptable' }),
		]);

		expect(result.validRows).toHaveLength(1);
		expect(result.warnings[0]?.messageKey).toBe('import.staff.validation.unknownRole');
		expect(canImportValidatedStaff(result)).toBe(true);
	});

	it('flags duplicate members within the file', () => {
		const result = validateStaffImportRows([
			row({ rowIndex: 2 }),
			row({ rowIndex: 3 }),
		]);

		expect(result.errors[0]?.messageKey).toBe('import.staff.validation.duplicateInFile');
		expect(result.validRows).toHaveLength(1);
	});
});
