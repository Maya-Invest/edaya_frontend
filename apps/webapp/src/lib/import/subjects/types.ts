export type SubjectImportColumnKey = 'nom' | 'niveau' | 'code' | 'coefficient';



export interface SubjectImportColumnDefinition {

	key: SubjectImportColumnKey;

	required: boolean;

}



export const SUBJECT_IMPORT_COLUMNS = [

	{ key: 'nom', required: true },

	{ key: 'niveau', required: true },

	{ key: 'code', required: false },

	{ key: 'coefficient', required: false },

] as const satisfies readonly SubjectImportColumnDefinition[];



export interface SubjectImportRow {

	rowIndex: number;

	nom: string;

	niveau: string;

	code?: string;

	coefficient?: string;

}



export interface ValidatedSubjectImportRow extends SubjectImportRow {

	gradeLevelId: string;

	classGroupIds: readonly string[];

	coefficientValue?: number;

}



export type SubjectImportValidationSeverity = 'error' | 'warning';



export interface SubjectImportValidationIssue {

	rowIndex: number;

	column?: SubjectImportColumnKey;

	value?: string;

	messageKey: string;

	messageParams?: Record<string, string | number>;

	severity: SubjectImportValidationSeverity;

	suggestions?: string[];

}



export interface SubjectImportValidationResult {

	validRows: ValidatedSubjectImportRow[];

	errors: SubjectImportValidationIssue[];

	warnings: SubjectImportValidationIssue[];

}



export interface SubjectImportGradeLevelOption {

	id: string;

	name: string;

}



export interface SubjectImportClassGroupOption {

	id: string;

	gradeLevelId: string;

}



export interface SubjectImportValidationContext {

	gradeLevels: readonly SubjectImportGradeLevelOption[];

	classGroups: readonly SubjectImportClassGroupOption[];

	existingSubjectKeys?: ReadonlySet<string>;

}

