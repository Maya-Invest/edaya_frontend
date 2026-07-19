import type {
	PaymentImportColumnKey,
	PaymentImportMethod,
	PaymentImportRow,
	PaymentImportValidationContext,
	PaymentImportValidationIssue,
	PaymentImportValidationResult,
	ValidatedPaymentImportRow,
} from './types';
import { canImportValidatedRows } from '$lib/import/shared/can-import-validated-rows';
import { normalizeStudentMatricule } from '$lib/import/shared/normalize-student-matricule';
import { isValidStudentImportBirthDate } from '$lib/import/students/validator';

const PAYMENT_METHODS = new Set<PaymentImportMethod>([
	'cash',
	'card',
	'bank_transfer',
	'mobile_money',
	'other',
]);

const METHOD_ALIASES: Record<string, PaymentImportMethod> = {
	cash: 'cash',
	especes: 'cash',
	espèces: 'cash',
	card: 'card',
	carte: 'card',
	bank_transfer: 'bank_transfer',
	virement: 'bank_transfer',
	mobile_money: 'mobile_money',
	mobile: 'mobile_money',
	other: 'other',
	autre: 'other',
};

function normalizeLookupValue(value: string): string {
	return value.trim().toLowerCase();
}

function issue(
	input: Omit<PaymentImportValidationIssue, 'severity'> & { severity?: PaymentImportValidationIssue['severity'] },
): PaymentImportValidationIssue {
	return {
		...input,
		severity: input.severity ?? 'error',
	};
}

function validateRequiredField(
	row: PaymentImportRow,
	column: PaymentImportColumnKey,
	value: string,
	issues: PaymentImportValidationIssue[],
): boolean {
	if (value.trim().length > 0) {
		return true;
	}
	issues.push(issue({
		rowIndex: row.rowIndex,
		column,
		messageKey: 'import.payments.validation.required',
	}));
	return false;
}

function resolveFeeId(
	feeName: string,
	context: PaymentImportValidationContext,
): { feeId?: string; suggestions?: string[] } {
	const key = normalizeLookupValue(feeName);
	const matches = context.fees.filter(fee => normalizeLookupValue(fee.name) === key);
	if (matches.length === 1) {
		return { feeId: matches[0]?.id };
	}

	const suggestions = context.fees
		.map(fee => fee.name)
		.filter(name => {
			const normalized = normalizeLookupValue(name);
			return normalized.includes(key) || key.includes(normalized);
		})
		.slice(0, 5);

	return {
		suggestions: suggestions.length > 0 ? suggestions : context.fees.slice(0, 5).map(fee => fee.name),
	};
}

function parsePaymentMethod(value?: string): PaymentImportMethod {
	if (!value?.trim()) {
		return 'cash';
	}
	const normalized = normalizeLookupValue(value).replace(/\s+/g, '_');
	return METHOD_ALIASES[normalized] ?? (PAYMENT_METHODS.has(normalized as PaymentImportMethod)
		? normalized as PaymentImportMethod
		: 'cash');
}

function defaultPaymentDate(): string {
	return new Date().toISOString().slice(0, 10);
}

export function validatePaymentImportRows(
	rows: readonly PaymentImportRow[],
	context: PaymentImportValidationContext,
): PaymentImportValidationResult {
	const errors: PaymentImportValidationIssue[] = [];
	const warnings: PaymentImportValidationIssue[] = [];
	const validRows: ValidatedPaymentImportRow[] = [];

	for (const row of rows) {
		const rowIssues: PaymentImportValidationIssue[] = [];

		const hasMatricule = validateRequiredField(row, 'matricule', row.matricule, rowIssues);
		const hasFeeType = validateRequiredField(row, 'type_frais', row.type_frais, rowIssues);
		const hasReference = validateRequiredField(row, 'reference', row.reference, rowIssues);

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
					messageKey: 'import.payments.validation.studentNotFound',
				}));
			}
		}

		let feeId: string | undefined;
		if (hasFeeType) {
			const resolution = resolveFeeId(row.type_frais, context);
			if (resolution.feeId) {
				feeId = resolution.feeId;
			}
			else {
				rowIssues.push(issue({
					rowIndex: row.rowIndex,
					column: 'type_frais',
					value: row.type_frais,
					messageKey: 'import.payments.validation.feeNotFound',
					suggestions: resolution.suggestions,
				}));
			}
		}

		let studentFeeId: string | undefined;
		let remaining = 0;
		if (studentId && feeId) {
			const studentFee = context.studentFees.find(entry => entry.studentId === studentId && entry.feeId === feeId);
			if (studentFee) {
				studentFeeId = studentFee.id;
				remaining = Math.max(studentFee.total - studentFee.paid, 0);
			}
			else {
				rowIssues.push(issue({
					rowIndex: row.rowIndex,
					column: 'type_frais',
					value: row.type_frais,
					messageKey: 'import.payments.validation.studentFeeNotFound',
				}));
			}
		}

		let amount = remaining;
		if (row.montant?.trim()) {
			const parsed = Number.parseFloat(row.montant.replace(',', '.'));
			if (!Number.isFinite(parsed) || parsed <= 0) {
				rowIssues.push(issue({
					rowIndex: row.rowIndex,
					column: 'montant',
					value: row.montant,
					messageKey: 'import.payments.validation.invalidAmount',
				}));
			}
			else {
				amount = parsed;
			}
		}

		if (studentFeeId && amount > remaining) {
			rowIssues.push(issue({
				rowIndex: row.rowIndex,
				column: 'montant',
				value: row.montant ?? String(amount),
				messageKey: 'import.payments.validation.amountExceedsRemaining',
				messageParams: { remaining },
			}));
		}

		let paymentDate = defaultPaymentDate();
		if (row.date?.trim()) {
			if (!isValidStudentImportBirthDate(row.date.trim())) {
				rowIssues.push(issue({
					rowIndex: row.rowIndex,
					column: 'date',
					value: row.date,
					messageKey: 'import.payments.validation.invalidDate',
				}));
			}
			else {
				paymentDate = row.date.trim();
			}
		}

		const method = parsePaymentMethod(row.mode);

		const blockingIssues = rowIssues.filter(entry => entry.severity === 'error');
		for (const rowIssue of rowIssues) {
			if (rowIssue.severity === 'warning') {
				warnings.push(rowIssue);
			}
			else {
				errors.push(rowIssue);
			}
		}

		if (blockingIssues.length === 0 && studentFeeId && hasReference && amount > 0) {
			validRows.push({
				...row,
				studentFeeId,
				amount,
				paymentDate,
				method,
			});
		}
	}

	return { validRows, errors, warnings };
}

export function canImportValidatedPayments(result: PaymentImportValidationResult | null): boolean {
	return canImportValidatedRows(result);
}
