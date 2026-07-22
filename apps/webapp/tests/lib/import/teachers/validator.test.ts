import { describe, expect, it } from 'bun:test';
import type { TeacherImportRow } from '$lib/import/teachers/types';
import {
	canImportValidatedTeachers,
	validateTeacherImportRows,
} from '$lib/import/teachers/validator';

function row(overrides: Partial<TeacherImportRow> & Pick<TeacherImportRow, 'rowIndex'>): TeacherImportRow {
	return {
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
			row({ rowIndex: 3, prenom: 'Marie', nom: 'Martin', email: 'marie@example.com' }),
		]);
		expect(result.validRows).toHaveLength(2);
		expect(canImportValidatedTeachers(result)).toBe(true);
	});

	it('rejects missing required fields', () => {
		const result = validateTeacherImportRows([
			row({ rowIndex: 2, prenom: '' }),
			row({ rowIndex: 3, nom: '' }),
		]);
		expect(result.validRows).toHaveLength(0);
		expect(result.errors.length).toBeGreaterThanOrEqual(2);
	});

	it('warns on invalid email but still imports', () => {
		const result = validateTeacherImportRows([
			row({ rowIndex: 2, email: 'not-an-email' }),
		]);
		expect(result.validRows).toHaveLength(1);
		expect(result.warnings[0]?.messageKey).toBe('import.teachers.validation.invalidEmail');
	});

	it('rejects duplicate teacher in file', () => {
		const result = validateTeacherImportRows([
			{ rowIndex: 2, prenom: 'Jean', nom: 'Dupont' },
			{ rowIndex: 3, prenom: 'Jean', nom: 'Dupont' },
		]);
		expect(result.validRows).toHaveLength(1);
		expect(result.errors[0]?.messageKey).toBe('import.teachers.validation.duplicateInFile');
	});
});
