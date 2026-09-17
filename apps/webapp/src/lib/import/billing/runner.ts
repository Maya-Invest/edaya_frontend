import type { getBrowserSchoolClient } from '$lib/api/school-client';
import type { ValidatedBillingImportRow } from './types';
import { enrollStudentInServiceMutation } from '$lib/api/mutations/billing.mutations';
import { t } from '$lib/i18n';
import { formatImportRunErrorMessage } from '$lib/import/shared/format-import-run-error';
import { get } from 'svelte/store';

type SchoolClient = ReturnType<typeof getBrowserSchoolClient>;

export interface BillingImportRunFailure {
	rowIndex: number;
	label: string;
	message: string;
}

export interface BillingImportRunResult {
	created: number;
	failed: BillingImportRunFailure[];
	studentFeeIds: string[];
}

export interface BillingImportRunOptions {
	client: SchoolClient;
	rows: readonly ValidatedBillingImportRow[];
	onProgress?: (current: number, total: number) => void;
}

export async function runBillingImport(options: BillingImportRunOptions): Promise<BillingImportRunResult> {
	const { rows, onProgress } = options;
	const failed: BillingImportRunFailure[] = [];
	const studentFeeIds: string[] = [];
	const total = rows.length;

	for (const [index, row] of rows.entries()) {
		onProgress?.(index, total);

		try {
			const enrollmentId = await enrollStudentInServiceMutation({
				id: `enr-import-${row.rowIndex}-${index}-${Date.now().toString(36)}`,
				studentId: row.studentId,
				catalogServiceId: row.feeId,
				priceOverride: row.expectedAmount,
				dueDate: row.dueDate
					? new Date(`${row.dueDate}T12:00:00`).toISOString()
					: undefined,
			});
			if (enrollmentId) {
				studentFeeIds.push(enrollmentId);
			}
			else {
				failed.push({
					rowIndex: row.rowIndex,
					label: `${row.matricule} · ${row.type_frais}`,
					message: get(t)('import.billing.runFailed'),
				});
			}
		}
		catch (error) {
			failed.push({
				rowIndex: row.rowIndex,
				label: `${row.matricule} · ${row.type_frais}`,
				message: formatImportRunErrorMessage(error, {
					entityLabel: row.type_frais,
				}, (key, params) => get(t)(key, params ?? {})),
			});
		}
	}

	onProgress?.(total, total);

	return {
		created: studentFeeIds.length,
		failed,
		studentFeeIds,
	};
}
