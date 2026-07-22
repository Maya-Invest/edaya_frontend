import { describe, expect, it } from 'bun:test';
import type { BillingImportRow, BillingImportValidationContext } from '$lib/import/billing/types';
import {
	canImportValidatedBilling,
	validateBillingImportRows,
} from '$lib/import/billing/validator';

function context(overrides: Partial<BillingImportValidationContext> = {}): BillingImportValidationContext {
	return {
		fees: [{ id: 'fee-1', name: 'Scolarité — Collège', amount: 150_000 }],
		assignedStudentFees: [],
		studentMatricules: new Map([
			['mat-2024-001', { studentId: 'stu-1', matricule: 'MAT-2024-001' }],
		]),
		...overrides,
	};
}

function row(overrides: Partial<BillingImportRow> & Pick<BillingImportRow, 'rowIndex'>): BillingImportRow {
	return {
		matricule: 'MAT-2024-001',
		type_frais: 'Scolarité — Collège',
		...overrides,
	};
}

describe('validateBillingImportRows', () => {
	it('accepts a valid row with default fee amount', () => {
		const result = validateBillingImportRows([row({ rowIndex: 2 })], context());
		expect(result.validRows).toHaveLength(1);
		expect(result.validRows[0]?.expectedAmount).toBe(150_000);
		expect(result.validRows[0]?.studentId).toBe('stu-1');
		expect(canImportValidatedBilling(result)).toBe(true);
	});

	it('rejects duplicate assignment in file and database', () => {
		const duplicateInDb = validateBillingImportRows(
			[row({ rowIndex: 2 })],
			context({ assignedStudentFees: [{ studentId: 'stu-1', feeId: 'fee-1' }] }),
		);
		expect(duplicateInDb.validRows).toHaveLength(0);
		expect(duplicateInDb.errors[0]?.messageKey).toBe('import.billing.validation.alreadyAssigned');

		const duplicateInFile = validateBillingImportRows(
			[row({ rowIndex: 2 }), row({ rowIndex: 3 })],
			context(),
		);
		expect(duplicateInFile.validRows).toHaveLength(1);
		expect(duplicateInFile.errors.some(e => e.messageKey === 'import.billing.validation.alreadyAssigned')).toBe(true);
	});

	it('requires amount when fee has no default', () => {
		const result = validateBillingImportRows(
			[row({ rowIndex: 2 })],
			context({ fees: [{ id: 'fee-1', name: 'Scolarité — Collège', amount: 0 }] }),
		);
		expect(result.validRows).toHaveLength(0);
		expect(result.errors[0]?.messageKey).toBe('import.billing.validation.amountRequired');
	});
});
