export type GuardianImportColumnKey = 'code' | 'prenom' | 'nom' | 'email' | 'telephone' | 'eleve_matricule';

export interface GuardianImportColumnDefinition {
	key: GuardianImportColumnKey;
	required: boolean;
}

export const GUARDIAN_IMPORT_COLUMNS = [
	{ key: 'code', required: true },
	{ key: 'prenom', required: true },
	{ key: 'nom', required: true },
	{ key: 'eleve_matricule', required: true },
	{ key: 'email', required: false },
	{ key: 'telephone', required: false },
] as const satisfies readonly GuardianImportColumnDefinition[];

export interface GuardianImportRow {
	rowIndex: number;
	code: string;
	prenom: string;
	nom: string;
	email?: string;
	telephone?: string;
	eleve_matricule: string;
}

export interface ValidatedGuardianImportRow extends GuardianImportRow {
	studentIds: readonly string[];
}

export type GuardianImportValidationSeverity = 'error' | 'warning';

export interface GuardianImportValidationIssue {
	rowIndex: number;
	column?: GuardianImportColumnKey;
	value?: string;
	messageKey: string;
	messageParams?: Record<string, string | number>;
	severity: GuardianImportValidationSeverity;
	suggestions?: string[];
}

export interface GuardianImportValidationResult {
	validRows: ValidatedGuardianImportRow[];
	errors: GuardianImportValidationIssue[];
	warnings: GuardianImportValidationIssue[];
}

export interface GuardianImportValidationContext {
	studentMatricules: ReadonlyMap<string, { studentId: string; matricule: string }>;
	multiValueSeparator: ';' | '&';
	existingCodes?: ReadonlySet<string>;
}
