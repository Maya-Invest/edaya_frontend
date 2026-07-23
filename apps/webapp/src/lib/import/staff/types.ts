export type StaffImportColumnKey = 'code' | 'prenom' | 'nom' | 'role' | 'email' | 'telephone';

export interface StaffImportColumnDefinition {
	key: StaffImportColumnKey;
	required: boolean;
}

export const STAFF_IMPORT_COLUMNS = [
	{ key: 'code', required: true },
	{ key: 'prenom', required: true },
	{ key: 'nom', required: true },
	{ key: 'role', required: true },
	{ key: 'email', required: false },
	{ key: 'telephone', required: false },
] as const satisfies readonly StaffImportColumnDefinition[];

export interface StaffImportRow {
	rowIndex: number;
	code: string;
	prenom: string;
	nom: string;
	role: string;
	email?: string;
	telephone?: string;
}

export type ValidatedStaffImportRow = StaffImportRow;

export type StaffImportValidationSeverity = 'error' | 'warning';

export interface StaffImportValidationIssue {
	rowIndex: number;
	column?: StaffImportColumnKey;
	value?: string;
	messageKey: string;
	messageParams?: Record<string, string | number>;
	severity: StaffImportValidationSeverity;
	suggestions?: string[];
}

export interface StaffImportValidationContext {
	existingCodes?: ReadonlySet<string>;
}

export interface StaffImportValidationResult {
	validRows: ValidatedStaffImportRow[];
	errors: StaffImportValidationIssue[];
	warnings: StaffImportValidationIssue[];
}
