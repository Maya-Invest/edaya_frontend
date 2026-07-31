import { describe, expect, it } from 'bun:test';
import type { TeacherImportRow } from '$lib/import/teachers/types';
import {
	canImportValidatedTeachers,
	validateTeacherImportRows,
} from '$lib/import/teachers/validator';
import { normalizeImportCode } from '$lib/import/shared/normalize-import-code';

function row(overrides: Partial<TeacherImportRow> & Pick<TeacherImportRow, 'rowIndex'>): TeacherImportRow {
	return {
		code: 'ENS-001',
		prenom: 'Jean',
		nom: 'Dupont',
		email: 'jean@example.com',
		...overrides,
	};
}

describe('validateTeacherImportRows', () => {
	it('accepts valid rows', () => {
		const result = validateTeacherImportRows([
			row({ rowIndex: 2 }),
			row({ rowIndex: 3, code: 'ENS-002', prenom: 'Marie', nom: 'Martin', email: 'marie@example.com' }),
		]);
		expect(result.validRows).toHaveLength(2);
		expect(canImportValidatedTeachers(result)).toBe(true);
	});

	it('rejects missing required fields', () => {
		const result = validateTeacherImportRows([
			row({ rowIndex: 2, code: '' }),
			row({ rowIndex: 3, code: 'ENS-003', prenom: '' }),
			row({ rowIndex: 4, code: 'ENS-004', nom: '' }),
		]);
		expect(result.validRows).toHaveLength(0);
		expect(result.errors.length).toBeGreaterThanOrEqual(3);
		expect(result.errors.some(issue => issue.column === 'code')).toBe(true);
	});

	it('warns on invalid email but still imports', () => {
		const result = validateTeacherImportRows([
			row({ rowIndex: 2, email: 'not-an-email' }),
		]);
		expect(result.validRows).toHaveLength(1);
		expect(result.warnings[0]?.messageKey).toBe('import.teachers.validation.invalidEmail');
	});

	it('rejects duplicate code in file', () => {
		const result = validateTeacherImportRows([
			row({ rowIndex: 2, code: 'ENS-001' }),
			row({ rowIndex: 3, code: 'ens-001', prenom: 'Marie', nom: 'Martin', email: 'marie@example.com' }),
		]);
		expect(result.validRows).toHaveLength(1);
		expect(result.errors[0]?.messageKey).toBe('import.teachers.validation.duplicateCodeInFile');
		expect(result.errors[0]?.messageParams).toEqual({ row: 2 });
	});

	it('rejects duplicate code vs existingCodes', () => {
		const result = validateTeacherImportRows(
			[row({ rowIndex: 2, code: 'ENS-010' })],
			{ existingCodes: new Set([normalizeImportCode('ENS-010')]) },
		);
		expect(result.validRows).toHaveLength(0);
		expect(result.errors[0]?.messageKey).toBe('import.teachers.validation.duplicateCodeExisting');
	});
});
