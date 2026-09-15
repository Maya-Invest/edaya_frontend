import { describe, expect, it, mock } from 'bun:test';
import type { ValidatedBillingImportRow } from '$lib/import/billing/types';

const enrollStudentInServiceMutation = mock(async (): Promise<string | null> => 'enr-new');

mock.module('$lib/api/mutations/billing.mutations', () => ({
	enrollStudentInServiceMutation,
	recordPaymentMutation: mock(async () => true),
}));

const { runBillingImport } = await import('$lib/import/billing/runner');

function row(overrides: Partial<ValidatedBillingImportRow> & Pick<ValidatedBillingImportRow, 'rowIndex'>): ValidatedBillingImportRow {
	return {
		matricule: 'CI-2025-001',
		type_frais: 'Scolarité — Collège',
		studentId: 'stu-1',
		feeId: 'fee-1',
		expectedAmount: 150_000,
		...overrides,
	};
}

describe('billing import runner', () => {
	it('enrolls each valid row sequentially', async () => {
		enrollStudentInServiceMutation.mockReset();
		enrollStudentInServiceMutation.mockResolvedValue('enr-new');
		const progress: Array<{ current: number; total: number }> = [];

		const result = await runBillingImport({
			client: {} as never,
			rows: [
				row({ rowIndex: 2 }),
				row({
					rowIndex: 3,
					matricule: 'CI-2025-002',
					studentId: 'stu-2',
					dueDate: '2025-10-15',
				}),
			],
			onProgress: (current, total) => {
				progress.push({ current, total });
			},
		});

		expect(result.created).toBe(2);
		expect(result.failed).toEqual([]);
		expect(result.studentFeeIds).toEqual(['enr-new', 'enr-new']);
		expect(enrollStudentInServiceMutation).toHaveBeenCalledTimes(2);
		expect(enrollStudentInServiceMutation).toHaveBeenNthCalledWith(1, {
			id: expect.stringMatching(/^enr-import-2-/),
			studentId: 'stu-1',
			catalogServiceId: 'fee-1',
			priceOverride: 150_000,
			dueDate: undefined,
		});
		expect(enrollStudentInServiceMutation).toHaveBeenNthCalledWith(2, {
			id: expect.stringMatching(/^enr-import-3-/),
			studentId: 'stu-2',
			catalogServiceId: 'fee-1',
			priceOverride: 150_000,
			dueDate: '2025-10-15T12:00:00.000Z',
		});
		expect(progress.at(-1)).toEqual({ current: 2, total: 2 });
	});

	it('collects failures when enrollStudentInServiceMutation returns null', async () => {
		enrollStudentInServiceMutation.mockReset();
		enrollStudentInServiceMutation.mockResolvedValue(null);

		const result = await runBillingImport({
			client: {} as never,
			rows: [row({ rowIndex: 2 })],
		});

		expect(result.created).toBe(0);
		expect(result.failed).toHaveLength(1);
		expect(result.failed[0]?.rowIndex).toBe(2);
		expect(result.failed[0]?.label).toBe('CI-2025-001 · Scolarité — Collège');
	});
});
