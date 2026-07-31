export type StudentImportColumnKey = 'prenom' | 'nom' | 'matricule' | 'classe' | 'date_naissance' | 'genre';

export interface StudentImportColumnDefinition {
	key: StudentImportColumnKey;
	required: boolean;
}

export const STUDENT_IMPORT_COLUMNS = [
	{ key: 'prenom', required: true },
	{ key: 'nom', required: true },
	{ key: 'matricule', required: true },
	{ key: 'classe', required: false },
	{ key: 'date_naissance', required: false },
	{ key: 'genre', required: false },
] as const satisfies readonly StudentImportColumnDefinition[];

export interface StudentImportRow {
	rowIndex: number;
	prenom: string;
	nom: string;
	matricule: string;
	classe?: string;
	date_naissance?: string;
	genre?: string;
}

export interface ValidatedStudentImportRow extends StudentImportRow {
	classGroupId?: string;
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
	studentCount: number;
	capacity?: number | null;
}

export interface StudentImportValidationContext {
	classes: readonly StudentImportClassOption[];
	existingMatricules?: ReadonlySet<string>;
}
