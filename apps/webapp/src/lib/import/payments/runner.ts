import type { getBrowserSchoolClient } from '$lib/api/school-client';
import type { ValidatedPaymentImportRow } from './types';
import { recordPaymentMutation } from '$lib/api/mutations/billing.mutations';
import { t } from '$lib/i18n';
import { formatImportRunErrorMessage } from '$lib/import/shared/format-import-run-error';
import { get } from 'svelte/store';

type SchoolClient = ReturnType<typeof getBrowserSchoolClient>;

export interface PaymentImportRunFailure {
	rowIndex: number;
	label: string;
	message: string;
}

export interface PaymentImportRunResult {
	created: number;
	failed: PaymentImportRunFailure[];
	paymentIds: string[];
}

export interface PaymentImportRunOptions {
	client: SchoolClient;
	rows: readonly ValidatedPaymentImportRow[];
	onProgress?: (current: number, total: number) => void;
}

export async function runPaymentImport(options: PaymentImportRunOptions): Promise<PaymentImportRunResult> {
	const { rows, onProgress } = options;
	const failed: PaymentImportRunFailure[] = [];
	const paymentIds: string[] = [];
	const total = rows.length;

	for (const [index, row] of rows.entries()) {
		onProgress?.(index, total);

		try {
			const paymentId = `pay-import-${row.rowIndex}-${index}-${Date.now().toString(36)}`;
			const targeted = row.allocationMode === 'targeted' && row.chargeId;
			const ok = await recordPaymentMutation({
				id: paymentId,
				studentId: row.studentId,
				academicYearId: row.academicYearId,
				amount: row.amount,
				paymentDate: new Date(`${row.paymentDate}T12:00:00`).toISOString(),
				method: row.method,
				reference: row.reference,
				notes: row.notes,
				allocation: targeted
					? {
							mode: 'targeted',
							targets: [{ chargeId: row.chargeId!, amount: row.amount }],
						}
					: { mode: 'account_only' },
			});
			if (ok) {
				paymentIds.push(paymentId);
			}
			else {
				failed.push({
					rowIndex: row.rowIndex,
					label: `${row.matricule} · ${row.type_frais || row.reference}`,
					message: get(t)('import.payments.runFailed'),
				});
			}
		}
		catch (error) {
			failed.push({
				rowIndex: row.rowIndex,
				label: `${row.matricule} · ${row.type_frais || row.reference}`,
				message: formatImportRunErrorMessage(error, {
					entityLabel: row.reference,
				}, (key, params) => get(t)(key, params ?? {})),
			});
		}
	}

	onProgress?.(total, total);

	return {
		created: paymentIds.length,
		failed,
		paymentIds,
	};
}
