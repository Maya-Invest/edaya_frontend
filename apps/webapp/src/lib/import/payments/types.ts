export type PaymentImportColumnKey = 'matricule' | 'type_frais' | 'reference' | 'montant' | 'date' | 'mode' | 'notes';

export interface PaymentImportColumnDefinition {
	key: PaymentImportColumnKey;
	required: boolean;
}

export const PAYMENT_IMPORT_COLUMNS = [
	{ key: 'matricule', required: true },
	{ key: 'type_frais', required: true },
	{ key: 'reference', required: true },
	{ key: 'montant', required: false },
	{ key: 'date', required: false },
	{ key: 'mode', required: false },
	{ key: 'notes', required: false },
] as const satisfies readonly PaymentImportColumnDefinition[];

export type PaymentImportMethod = 'cash' | 'card' | 'bank_transfer' | 'mobile_money' | 'other';

export interface PaymentImportRow {
	rowIndex: number;
	matricule: string;
	type_frais: string;
	reference: string;
	montant?: string;
	date?: string;
	mode?: string;
	notes?: string;
}

export interface ValidatedPaymentImportRow extends PaymentImportRow {
	studentFeeId: string;
	amount: number;
	paymentDate: string;
	method: PaymentImportMethod;
}

export type PaymentImportValidationSeverity = 'error' | 'warning';

export interface PaymentImportValidationIssue {
	rowIndex: number;
	column?: PaymentImportColumnKey;
	value?: string;
	messageKey: string;
	messageParams?: Record<string, string | number>;
	severity: PaymentImportValidationSeverity;
	suggestions?: string[];
}

export interface PaymentImportValidationResult {
	validRows: ValidatedPaymentImportRow[];
	errors: PaymentImportValidationIssue[];
	warnings: PaymentImportValidationIssue[];
}

export interface PaymentImportFeeOption {
	id: string;
	name: string;
}

export interface PaymentImportStudentFeeOption {
	id: string;
	studentId: string;
	feeId: string;
	total: number;
	paid: number;
}

export interface PaymentImportValidationContext {
	fees: readonly PaymentImportFeeOption[];
	studentFees: readonly PaymentImportStudentFeeOption[];
	studentMatricules: ReadonlyMap<string, { studentId: string; matricule: string }>;
}
