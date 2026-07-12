export type StudentImportColumnKey = 'prenom' | 'nom' | 'classe' | 'date_naissance' | 'genre' | 'matricule';

export interface StudentImportColumnDefinition {
	key: StudentImportColumnKey;
	required: boolean;
}

export const STUDENT_IMPORT_COLUMNS = [
	{ key: 'prenom', required: true },
	{ key: 'nom', required: true },
	{ key: 'classe', required: true },
	{ key: 'date_naissance', required: false },
	{ key: 'genre', required: false },
	{ key: 'matricule', required: false },
] as const satisfies readonly StudentImportColumnDefinition[];

export interface StudentImportRow {
	rowIndex: number;
	prenom: string;
	nom: string;
	classe: string;
	date_naissance?: string;
	genre?: string;
	matricule?: string;
}

export interface ValidatedStudentImportRow extends StudentImportRow {
	classGroupId: string;
}

export type StudentImportValidationSeverity = 'error' | 'warning';

export interface StudentImportValidationIssue {
	rowIndex: number;
	column?: StudentImportColumnKey;
	value?: string;
	messageKey: string;
	messageParams?: Record<string, string | number>;
	severity: StudentImportValidationSeverity;
	suggestions?: string[];
}

export interface StudentImportValidationResult {
	validRows: ValidatedStudentImportRow[];
	errors: StudentImportValidationIssue[];
	warnings: StudentImportValidationIssue[];
}

export interface StudentImportClassOption {
	id: string;
	name: string;
}

export interface StudentImportValidationContext {
	classes: readonly StudentImportClassOption[];
	existingMatricules?: ReadonlySet<string>;
}
