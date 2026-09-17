import { describe, expect, it, mock } from 'bun:test';
import type { ValidatedPaymentImportRow } from '$lib/import/payments/types';

const recordPaymentMutation = mock(async () => true);

mock.module('$lib/api/mutations/billing.mutations', () => ({
	recordPaymentMutation,
	enrollStudentInServiceMutation: mock(async (): Promise<string | null> => null),
}));

const { runPaymentImport } = await import('$lib/import/payments/runner');

function row(overrides: Partial<ValidatedPaymentImportRow> & Pick<ValidatedPaymentImportRow, 'rowIndex'>): ValidatedPaymentImportRow {
	return {
		matricule: 'CI-2025-001',
		type_frais: 'Scolarité — Collège',
		reference: 'MM-CI-2025-100',
		studentId: 'stu-1',
		chargeId: 'sf-1',
		academicYearId: 'year-1',
		amount: 75_000,
		paymentDate: '2025-09-01',
		method: 'mobile_money',
		allocationMode: 'targeted',
		...overrides,
	};
}

describe('payment import runner', () => {
	it('records each valid row sequentially as a targeted receipt', async () => {
		recordPaymentMutation.mockReset();
		recordPaymentMutation.mockResolvedValue(true);
		const progress: Array<{ current: number; total: number }> = [];

		const result = await runPaymentImport({
			client: {} as never,
			rows: [
				row({ rowIndex: 2 }),
				row({
					rowIndex: 3,
					matricule: 'CI-2025-002',
					studentId: 'stu-2',
					reference: 'VIR-CI-2025-101',
					chargeId: 'sf-2',
					amount: 100_000,
					paymentDate: '2025-09-02',
					method: 'bank_transfer',
				}),
			],
			onProgress: (current, total) => {
				progress.push({ current, total });
			},
		});

		expect(result.created).toBe(2);
		expect(result.failed).toEqual([]);
		expect(result.paymentIds).toHaveLength(2);
		expect(result.paymentIds[0]).toMatch(/^pay-import-2-/);
		expect(recordPaymentMutation).toHaveBeenCalledTimes(2);
		expect(recordPaymentMutation).toHaveBeenNthCalledWith(1, {
			id: expect.stringMatching(/^pay-import-2-/),
			studentId: 'stu-1',
			academicYearId: 'year-1',
			amount: 75_000,
			paymentDate: '2025-09-01T12:00:00.000Z',
			method: 'mobile_money',
			reference: 'MM-CI-2025-100',
			notes: undefined,
			allocation: {
				mode: 'targeted',
				targets: [{ chargeId: 'sf-1', amount: 75_000 }],
			},
		});
		expect(progress.at(-1)).toEqual({ current: 2, total: 2 });
	});

	it('collects failures when recordPaymentMutation returns false', async () => {
		recordPaymentMutation.mockReset();
		recordPaymentMutation.mockResolvedValueOnce(false);

		const result = await runPaymentImport({
			client: {} as never,
			rows: [row({ rowIndex: 2 })],
		});

		expect(result.created).toBe(0);
		expect(result.failed).toHaveLength(1);
		expect(result.failed[0]?.rowIndex).toBe(2);
		expect(result.failed[0]?.label).toBe('CI-2025-001 · Scolarité — Collège');
	});

	it('records a deposit-only receipt when allocationMode is account_only', async () => {
		recordPaymentMutation.mockReset();
		recordPaymentMutation.mockResolvedValue(true);

		const result = await runPaymentImport({
			client: {} as never,
			rows: [row({
				rowIndex: 2,
				type_frais: '',
				chargeId: undefined,
				allocationMode: 'account_only',
				reference: 'DEP-1',
			})],
		});

		expect(result.created).toBe(1);
		expect(recordPaymentMutation).toHaveBeenNthCalledWith(1, expect.objectContaining({
			allocation: { mode: 'account_only' },
			reference: 'DEP-1',
		}));
	});
});
