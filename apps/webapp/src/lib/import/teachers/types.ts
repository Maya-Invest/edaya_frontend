export type TeacherImportColumnKey = 'code' | 'prenom' | 'nom' | 'email' | 'telephone';

export interface TeacherImportColumnDefinition {
	key: TeacherImportColumnKey;
	required: boolean;
}

export const TEACHER_IMPORT_COLUMNS = [
	{ key: 'code', required: true },
	{ key: 'prenom', required: true },
	{ key: 'nom', required: true },
	{ key: 'email', required: false },
	{ key: 'telephone', required: false },
] as const satisfies readonly TeacherImportColumnDefinition[];

export interface TeacherImportRow {
	rowIndex: number;
	code: string;
	prenom: string;
	nom: string;
	email?: string;
	telephone?: string;
}

export type ValidatedTeacherImportRow = TeacherImportRow;

export type TeacherImportValidationSeverity = 'error' | 'warning';

export interface TeacherImportValidationIssue {
	rowIndex: number;
	column?: TeacherImportColumnKey;
	value?: string;
	messageKey: string;
	messageParams?: Record<string, string | number>;
	severity: TeacherImportValidationSeverity;
	suggestions?: string[];
}

export interface TeacherImportValidationContext {
	existingCodes?: ReadonlySet<string>;
}

export interface TeacherImportValidationResult {
	validRows: ValidatedTeacherImportRow[];
	errors: TeacherImportValidationIssue[];
	warnings: TeacherImportValidationIssue[];
}
