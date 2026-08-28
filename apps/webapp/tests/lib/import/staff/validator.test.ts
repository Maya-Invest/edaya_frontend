import { describe, expect, it } from 'bun:test';
import type { StaffImportRow } from '$lib/import/staff/types';
import {
	canImportValidatedStaff,
	validateStaffImportRows,
} from '$lib/import/staff/validator';
import { normalizeImportCode } from '$lib/import/shared/normalize-import-code';

function row(overrides: Partial<StaffImportRow> & Pick<StaffImportRow, 'rowIndex'>): StaffImportRow {
	return {
		code: 'PER-001',
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
			row({ rowIndex: 3, code: 'PER-002', prenom: 'Kofi', nom: 'Mensah', role: 'Directeur adjoint' }),
		]);

		expect(result.errors).toEqual([]);
		expect(result.validRows).toHaveLength(2);
		expect(canImportValidatedStaff(result)).toBe(true);
	});

	it('flags missing required fields', () => {
		const result = validateStaffImportRows([
			row({ rowIndex: 2, code: '' }),
			row({ rowIndex: 3, code: 'PER-003', role: '' }),
		]);

		expect(result.validRows).toHaveLength(0);
		expect(result.errors.some(issue => issue.column === 'code')).toBe(true);
		expect(result.errors.some(issue => issue.messageKey === 'import.staff.validation.required')).toBe(true);
	});

	it('warns on unknown roles without blocking import', () => {
		const result = validateStaffImportRows([
			row({ rowIndex: 2, role: 'Gardien' }),
		]);

		expect(result.validRows).toHaveLength(1);
		expect(result.warnings[0]?.messageKey).toBe('import.staff.validation.unknownRole');
		expect(canImportValidatedStaff(result)).toBe(true);
	});

	it('rejects duplicate code in file', () => {
		const result = validateStaffImportRows([
			row({ rowIndex: 2, code: 'PER-001' }),
			row({ rowIndex: 3, code: 'per-001', prenom: 'Kofi', nom: 'Mensah', role: 'Directeur adjoint' }),
		]);

		expect(result.errors[0]?.messageKey).toBe('import.staff.validation.duplicateCodeInFile');
		expect(result.validRows).toHaveLength(1);
	});

	it('rejects duplicate code vs existingCodes', () => {
		const result = validateStaffImportRows(
			[row({ rowIndex: 2, code: 'PER-010' })],
			{ existingCodes: new Set([normalizeImportCode('PER-010')]) },
		);

		expect(result.validRows).toHaveLength(0);
		expect(result.errors[0]?.messageKey).toBe('import.staff.validation.duplicateCodeExisting');
	});
});
