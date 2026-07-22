import type {
	BillingImportColumnKey,
	BillingImportRow,
	BillingImportValidationContext,
	BillingImportValidationIssue,
	BillingImportValidationResult,
	ValidatedBillingImportRow,
} from './types';
import { canImportValidatedRows } from '$lib/import/shared/can-import-validated-rows';
import { normalizeStudentMatricule } from '$lib/import/shared/normalize-student-matricule';
import { resolveFeeIdByName } from '$lib/import/shared/resolve-fee-by-name';
import { isValidStudentImportBirthDate } from '$lib/import/students/validator';

function issue(
	input: Omit<BillingImportValidationIssue, 'severity'> & { severity?: BillingImportValidationIssue['severity'] },
): BillingImportValidationIssue {
	return {
		...input,
		severity: input.severity ?? 'error',
	};
}

function validateRequiredField(
	row: BillingImportRow,
	column: BillingImportColumnKey,
	value: string,
	issues: BillingImportValidationIssue[],
): boolean {
	if (value.trim().length > 0) {
		return true;
	}
	issues.push(issue({
		rowIndex: row.rowIndex,
		column,
		messageKey: 'import.billing.validation.required',
	}));
	return false;
}

function isAssignmentDuplicate(
	context: BillingImportValidationContext,
	studentId: string,
	feeId: string,
): boolean {
	return context.assignedStudentFees.some(
		entry => entry.studentId === studentId && entry.feeId === feeId,
	);
}

export function validateBillingImportRows(
	rows: readonly BillingImportRow[],
	context: BillingImportValidationContext,
): BillingImportValidationResult {
	const errors: BillingImportValidationIssue[] = [];
	const warnings: BillingImportValidationIssue[] = [];
	const validRows: ValidatedBillingImportRow[] = [];
	const pendingAssignments = new Set<string>();

	for (const row of rows) {
		const rowIssues: BillingImportValidationIssue[] = [];

		const hasMatricule = validateRequiredField(row, 'matricule', row.matricule, rowIssues);
		const hasFeeType = validateRequiredField(row, 'type_frais', row.type_frais, rowIssues);

		let studentId: string | undefined;
		if (hasMatricule) {
			const match = context.studentMatricules.get(normalizeStudentMatricule(row.matricule));
			if (match) {
				studentId = match.studentId;
			}
			else {
				rowIssues.push(issue({
					rowIndex: row.rowIndex,
					column: 'matricule',
					value: row.matricule,
					messageKey: 'import.billing.validation.studentNotFound',
				}));
			}
		}

		let feeId: string | undefined;
		let feeDefaultAmount = 0;
		if (hasFeeType) {
			const resolution = resolveFeeIdByName(row.type_frais, context.fees);
			if (resolution.feeId) {
				feeId = resolution.feeId;
				feeDefaultAmount = context.fees.find(fee => fee.id === feeId)?.amount ?? 0;
			}
			else {
				rowIssues.push(issue({
					rowIndex: row.rowIndex,
					column: 'type_frais',
					value: row.type_frais,
					messageKey: 'import.billing.validation.feeNotFound',
					suggestions: resolution.suggestions,
				}));
			}
		}

		if (studentId && feeId) {
			const assignmentKey = `${studentId}:${feeId}`;
			if (isAssignmentDuplicate(context, studentId, feeId) || pendingAssignments.has(assignmentKey)) {
				rowIssues.push(issue({
					rowIndex: row.rowIndex,
					column: 'type_frais',
					value: row.type_frais,
					messageKey: 'import.billing.validation.alreadyAssigned',
				}));
			}
		}

		let expectedAmount = feeDefaultAmount;
		if (row.montant?.trim()) {
			const parsed = Number.parseFloat(row.montant.replace(',', '.'));
			if (!Number.isFinite(parsed) || parsed <= 0) {
				rowIssues.push(issue({
					rowIndex: row.rowIndex,
					column: 'montant',
					value: row.montant,
					messageKey: 'import.billing.validation.invalidAmount',
				}));
			}
			else {
				expectedAmount = parsed;
			}
		}
		else if (feeId && expectedAmount <= 0) {
			rowIssues.push(issue({
				rowIndex: row.rowIndex,
				column: 'montant',
				messageKey: 'import.billing.validation.amountRequired',
			}));
		}

		let dueDate: string | undefined;
		if (row.date_echeance?.trim()) {
			if (!isValidStudentImportBirthDate(row.date_echeance.trim())) {
				rowIssues.push(issue({
					rowIndex: row.rowIndex,
					column: 'date_echeance',
					value: row.date_echeance,
					messageKey: 'import.billing.validation.invalidDueDate',
				}));
			}
			else {
				dueDate = row.date_echeance.trim();
			}
		}

		const blockingIssues = rowIssues.filter(entry => entry.severity === 'error');
		for (const rowIssue of rowIssues) {
			if (rowIssue.severity === 'warning') {
				warnings.push(rowIssue);
			}
			else {
				errors.push(rowIssue);
			}
		}

		if (blockingIssues.length === 0 && studentId && feeId && expectedAmount > 0) {
			const assignmentKey = `${studentId}:${feeId}`;
			pendingAssignments.add(assignmentKey);
			validRows.push({
				...row,
				studentId,
				feeId,
				expectedAmount,
				...(dueDate ? { dueDate } : {}),
			});
		}
	}

	return { validRows, errors, warnings };
}

export function canImportValidatedBilling(result: BillingImportValidationResult | null): boolean {
	return canImportValidatedRows(result);
}
