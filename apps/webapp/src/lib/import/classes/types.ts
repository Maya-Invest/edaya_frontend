export type ClassImportColumnKey = 'nom' | 'niveau' | 'capacite';

export interface ClassImportColumnDefinition {
	key: ClassImportColumnKey;
	required: boolean;
}

export const CLASS_IMPORT_COLUMNS = [
	{ key: 'nom', required: true },
	{ key: 'niveau', required: true },
	{ key: 'capacite', required: false },
] as const satisfies readonly ClassImportColumnDefinition[];

export interface ClassImportRow {
	rowIndex: number;
	nom: string;
	niveau: string;
	capacite?: string;
}

export interface ValidatedClassImportRow extends ClassImportRow {
	gradeLevelId: string;
	capacity?: number;
}

export type ClassImportValidationSeverity = 'error' | 'warning';

export interface ClassImportValidationIssue {
	rowIndex: number;
	column?: ClassImportColumnKey;
	value?: string;
	messageKey: string;
	messageParams?: Record<string, string | number>;
	severity: ClassImportValidationSeverity;
	suggestions?: string[];
}

export interface ClassImportValidationResult {
	validRows: ValidatedClassImportRow[];
	errors: ClassImportValidationIssue[];
	warnings: ClassImportValidationIssue[];
}

export interface ClassImportGradeLevelOption {
	id: string;
	name: string;
}

export interface ClassImportExistingClassOption {
	id: string;
	name: string;
	gradeLevelId: string;
}

export interface ClassImportValidationContext {
	gradeLevels: readonly ClassImportGradeLevelOption[];
	existingClasses: readonly ClassImportExistingClassOption[];
}
