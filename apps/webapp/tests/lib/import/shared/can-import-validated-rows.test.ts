import { describe, expect, it } from 'bun:test';
import { canImportValidatedRows } from '$lib/import/shared/can-import-validated-rows';

describe('canImportValidatedRows', () => {
	it('returns false for null or empty valid rows', () => {
		expect(canImportValidatedRows(null)).toBe(false);
		expect(canImportValidatedRows({ validRows: [] })).toBe(false);
	});

	it('returns true when at least one valid row exists', () => {
		expect(canImportValidatedRows({ validRows: [{ rowIndex: 2 }] })).toBe(true);
	});
});
