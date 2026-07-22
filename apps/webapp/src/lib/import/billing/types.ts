export type BillingImportColumnKey = 'matricule' | 'type_frais' | 'montant' | 'date_echeance';

export interface BillingImportColumnDefinition {
	key: BillingImportColumnKey;
	required: boolean;
}

export const BILLING_IMPORT_COLUMNS = [
	{ key: 'matricule', required: true },
	{ key: 'type_frais', required: true },
	{ key: 'montant', required: false },
	{ key: 'date_echeance', required: false },
] as const satisfies readonly BillingImportColumnDefinition[];

export interface BillingImportRow {
	rowIndex: number;
	matricule: string;
	type_frais: string;
	montant?: string;
	date_echeance?: string;
}

export interface ValidatedBillingImportRow extends BillingImportRow {
	studentId: string;
	feeId: string;
	expectedAmount: number;
	dueDate?: string;
}

export type BillingImportValidationSeverity = 'error' | 'warning';

export interface BillingImportValidationIssue {
	rowIndex: number;
	column?: BillingImportColumnKey;
	value?: string;
	messageKey: string;
	messageParams?: Record<string, string | number>;
	severity: BillingImportValidationSeverity;
	suggestions?: string[];
}

export interface BillingImportValidationResult {
	validRows: ValidatedBillingImportRow[];
	errors: BillingImportValidationIssue[];
	warnings: BillingImportValidationIssue[];
}

export interface BillingImportFeeOption {
	id: string;
	name: string;
	amount: number;
}

export interface BillingImportStudentFeeKey {
	studentId: string;
	feeId: string;
}

export interface BillingImportValidationContext {
	fees: readonly BillingImportFeeOption[];
	assignedStudentFees: readonly BillingImportStudentFeeKey[];
	studentMatricules: ReadonlyMap<string, { studentId: string; matricule: string }>;
}
