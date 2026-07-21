import { describe, expect, it } from 'bun:test';
import type { PaymentImportRow, PaymentImportValidationContext } from '$lib/import/payments/types';
import {
	canImportValidatedPayments,
	validatePaymentImportRows,
} from '$lib/import/payments/validator';

const CONTEXT: PaymentImportValidationContext = {
	fees: [
		{ id: 'fee-scolarite', name: 'Scolarité — Collège' },
		{ id: 'fee-cantine', name: 'Cantine' },
	],
	studentMatricules: new Map([
		['ci-2025-001', { studentId: 'stu-1', matricule: 'CI-2025-001' }],
		['ci-2025-002', { studentId: 'stu-2', matricule: 'CI-2025-002' }],
	]),
	studentFees: [
		{ id: 'sf-1', studentId: 'stu-1', feeId: 'fee-scolarite', total: 150_000, paid: 75_000 },
		{ id: 'sf-2', studentId: 'stu-2', feeId: 'fee-scolarite', total: 150_000, paid: 0 },
	],
};

function row(overrides: Partial<PaymentImportRow> & Pick<PaymentImportRow, 'rowIndex'>): PaymentImportRow {
	return {
		matricule: 'CI-2025-001',
		type_frais: 'Scolarité — Collège',
		reference: 'MM-CI-2025-100',
		...overrides,
	};
}

describe('payment import validator', () => {
	it('accepts valid rows and resolves student fee, amount, date and method', () => {
		const result = validatePaymentImportRows([
			row({
				rowIndex: 2,
				montant: '50000',
				date: '2025-09-01',
				mode: 'virement',
			}),
		], CONTEXT);

		expect(result.errors).toEqual([]);
		expect(result.warnings).toEqual([]);
		expect(result.validRows).toHaveLength(1);
		expect(result.validRows[0]).toMatchObject({
			studentFeeId: 'sf-1',
			amount: 50_000,
			paymentDate: '2025-09-01',
			method: 'bank_transfer',
		});
	});

	it('uses remaining balance when montant is empty', () => {
		const result = validatePaymentImportRows([
			row({ rowIndex: 2, montant: '' }),
		], CONTEXT);

		expect(result.errors).toEqual([]);
		expect(result.validRows[0]?.amount).toBe(75_000);
	});

	it('flags missing required fields', () => {
		const result = validatePaymentImportRows([
			row({ rowIndex: 2, matricule: '' }),
			row({ rowIndex: 3, type_frais: '' }),
			row({ rowIndex: 4, reference: '' }),
		], CONTEXT);

		expect(result.validRows).toEqual([]);
		expect(result.errors.map(issue => issue.messageKey)).toEqual([
			'import.payments.validation.required',
			'import.payments.validation.required',
			'import.payments.validation.required',
		]);
	});

	it('flags unknown student matricules', () => {
		const result = validatePaymentImportRows([
			row({ rowIndex: 2, matricule: 'CI-2025-999' }),
		], CONTEXT);

		expect(result.validRows).toEqual([]);
		expect(result.errors[0]?.messageKey).toBe('import.payments.validation.studentNotFound');
	});

	it('flags unknown fee types with suggestions', () => {
		const result = validatePaymentImportRows([
			row({ rowIndex: 2, type_frais: 'Frais de scolarité' }),
		], CONTEXT);

		expect(result.validRows).toEqual([]);
		expect(result.errors[0]?.messageKey).toBe('import.payments.validation.feeNotFound');
		expect(result.errors[0]?.suggestions).toContain('Scolarité — Collège');
	});

	it('flags fees that are not assigned to the student', () => {
		const result = validatePaymentImportRows([
			row({ rowIndex: 2, type_frais: 'Cantine' }),
		], CONTEXT);

		expect(result.validRows).toEqual([]);
		expect(result.errors[0]?.messageKey).toBe('import.payments.validation.studentFeeNotFound');
	});

	it('flags invalid amounts and amounts exceeding the remaining balance', () => {
		const invalidAmount = validatePaymentImportRows([
			row({ rowIndex: 2, montant: 'abc' }),
		], CONTEXT);
		expect(invalidAmount.validRows).toEqual([]);
		expect(invalidAmount.errors[0]?.messageKey).toBe('import.payments.validation.invalidAmount');

		const exceedsRemaining = validatePaymentImportRows([
			row({ rowIndex: 3, montant: '999999' }),
		], CONTEXT);
		expect(exceedsRemaining.validRows).toEqual([]);
		expect(exceedsRemaining.errors[0]?.messageKey).toBe('import.payments.validation.amountExceedsRemaining');
		expect(exceedsRemaining.errors[0]?.messageParams).toEqual({ remaining: 75_000 });
	});

	it('flags invalid payment dates', () => {
		const result = validatePaymentImportRows([
			row({ rowIndex: 2, date: '15/09/2025' }),
		], CONTEXT);

		expect(result.validRows).toEqual([]);
		expect(result.errors[0]?.messageKey).toBe('import.payments.validation.invalidDate');
	});

	it('enables import when there are valid rows, even with blocking errors on other rows', () => {
		const partial = validatePaymentImportRows([
			row({ rowIndex: 2 }),
			row({ rowIndex: 3, matricule: '' }),
		], CONTEXT);

		expect(canImportValidatedPayments(partial)).toBe(true);
		expect(partial.validRows).toHaveLength(1);
		expect(partial.errors.length).toBeGreaterThan(0);
	});
});
